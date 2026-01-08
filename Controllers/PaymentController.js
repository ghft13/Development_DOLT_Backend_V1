const { db } = require('../Config/FireBase.js');
const PaymentService = require('../Services/PaymentService');

/**
 * PaymentController
 * Handles HTTP requests for Payment operations.
 * Implements "Fail Fast" (Guard Clauses) pattern.
 */

// --- Helper Functions ---
const success = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const error = (res, message, statusCode = 500, error = null) => {
    const response = {
        success: false,
        message
    };

    if (error && process.env.NODE_ENV !== 'production') {
        response.details = error.message || error;
    }

    return res.status(statusCode).json(response);
};

const getTransactionWithProvider = async (paymentId) => {
    let txQuery = await db.collection('transactions').where('paymentId', '==', parseInt(paymentId)).get();
    if (txQuery.empty) txQuery = await db.collection('transactions').where('paymentId', '==', String(paymentId)).get();

    if (txQuery.empty) {
        return { error: 'Transaction not found', statusCode: 404 };
    }

    const txDoc = txQuery.docs[0];
    const txData = txDoc.data();

    const providerDoc = await db.collection('providers').doc(txData.providerId).get();

    if (!providerDoc.exists) {
        return { error: 'Provider data missing', statusCode: 404 };
    }

    const providerData = providerDoc.data();

    return { txDoc, txData, providerData };
};

// --- Controller Methods ---

// 1. Authorize: Generate OAuth URL
const authorize = async (req, res) => {
    try {
        const { providerId } = req.query;

        if (!providerId) {
            return error(res, 'providerId is required', 400);
        }

        const authUrl = PaymentService.getAuthorizationURL(providerId);
        return success(res, 'Authorization URL generated', { authUrl });

    } catch (err) {
        return error(res, err.message);
    }
};

// 2. Connect: Link Provider Account
const connect = async (req, res) => {
    try {
        const { code, state } = req.query; // state = providerId

        if (!code || !state) {
            return error(res, 'Missing authorization code or state', 400);
        }

        const credentials = await PaymentService.createProviderConnection(code);

        await db.collection('serviceProviders').doc(state).update({
            mp_account: {
                mp_access_token: credentials.access_token,
                mp_refresh_token: credentials.refresh_token,
                mp_user_id: credentials.user_id,
                mp_public_key: credentials.public_key,
                mp_connected_at: new Date().toISOString(),
                mp_connected: true
            }
        });

        return success(res, 'Provider connected successfully', { user_id: credentials.user_id });
    } catch (err) {
        return error(res, err.message);
    }
};

// 3. Create Payment Intent
const createPayment = async (req, res) => {
    try {
        const body = req.body;
        const { platformFeePercent = 10, providerId } = body;

        if (!providerId) {
            return error(res, "providerId is required in the request body", 400);
        }

        const providerDoc = await db.collection('providers').doc(providerId).get();
        if (!providerDoc.exists) {
            return error(res, 'Provider not found', 404);
        }

        const providerData = providerDoc.data();
        if (!providerData?.mp_access_token) {
            return error(res, 'Provider is not connected to Mercado Pago', 400);
        }

        const totalAmount = parseFloat(body.total_amount);
        const applicationFee = (totalAmount * platformFeePercent) / 100;

        const firstPayment = body.transactions?.payments?.[0] || {};
        const methodData = firstPayment.payment_method || {};
        const payerData = body.payer || {};

        const paymentResponse = await PaymentService.createPayment({
            totalAmount,
            token: methodData.token || body.token,
            installments: methodData.installments || body.installments,
            paymentMethodId: methodData.id || body.payment_method_id,
            payerEmail: payerData.email,
            payerDoc: payerData.identification,
            payer: payerData, // Pass full payer object
            providerAccessToken: providerData.mp_access_token,
            applicationFee,
            description: body.description,
            externalReference: body.external_reference,
            additionalInfo: body.additional_info // Pass additional_info containing items
        });

        const validStatuses = ['authorized', 'in_process', 'pending', 'approved'];

        if (!validStatuses.includes(paymentResponse.status)) {
            return error(res, 'Payment Unauthorized', 400, {
                status: paymentResponse.status,
                mp_response: paymentResponse
            });
        }

        const escrowCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const transactionRef = await db.collection('transactions').add({
            paymentId: paymentResponse.id,
            amount: paymentResponse.transaction_amount,
            status: paymentResponse.status,
            escrowCode: escrowCode,
            providerId: providerId,
            payerEmail: payerData.email,
            externalReference: body.external_reference,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // check mp transaction expiresat
        });

        return success(res, 'Payment Authorized', {
            paymentId: paymentResponse.id,
            escrowCode: escrowCode,
            transactionId: transactionRef.id,
            status: paymentResponse.status,
            status_detail: paymentResponse.status_detail
        });

    } catch (err) {
        return error(res, err.message, 500, err);
    }
};

const cancelPayment = async (req, res) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return error(res, 'Missing paymentId', 400);
        }

        const { txDoc, txData, providerData, error: lookupError, statusCode } = await getTransactionWithProvider(paymentId);
        if (lookupError) return error(res, lookupError, statusCode);

        if (txData.status !== 'pending' && txData.status !== 'in_process') {
            return error(res, 'Payment is not pending or in process. Status: ' + txData.status, 400);
        }

        console.log(txData.paymentId);
        const cancelResponse = await PaymentService.cancelPayment(txData.paymentId, providerData.mp_access_token);

        if (['cancelled'].includes(cancelResponse.status)) {
            await txDoc.ref.update({
                status: cancelResponse.status,
                status_detail: cancelResponse.status_detail
            });

            return success(res, 'Payment canceled successfully', cancelResponse);
        }

        return error(res, 'Payment cancel failed', 400, cancelResponse);
    } catch (err) {
        return error(res, err.message);
    }
};

const refundPayment = async (req, res) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return error(res, 'Missing paymentId', 400);
        }

        const { txDoc, txData, providerData, error: lookupError, statusCode } = await getTransactionWithProvider(paymentId);
        if (lookupError) return error(res, lookupError, statusCode);

        if (txData.status !== 'captured') {
            return error(res, 'Payment is not captured', 400);
        }

        const refundResponse = await PaymentService.refundPayment(txData.paymentId, providerData.mp_access_token);

        if (['approved'].includes(refundResponse.status)) {
            await txDoc.ref.update({
                status: refundResponse.status,
                status_detail: refundResponse.status_detail
            });

            return success(res, 'Payment refunded successfully', refundResponse);
        }

        return error(res, 'Payment refund failed', 400, refundResponse);
    } catch (err) {
        return error(res, err.message);
    }
}

// 4. Capture Payment (Release Funds)
const capturePayment = async (req, res) => {
    try {
        const { paymentId, escrowCode } = req.body;

        if (!paymentId || !escrowCode) {
            return error(res, 'Missing paymentId or escrowCode', 400);
        }

        const { txDoc, txData, providerData, error: lookupError, statusCode } = await getTransactionWithProvider(paymentId);
        if (lookupError) return error(res, lookupError, statusCode);

        if (txData.status === 'captured') {
            return success(res, 'Payment already captured');
        }

        if (txData.escrowCode !== escrowCode) {
            return error(res, 'Invalid Verification Code', 403);
        }

        if (['in_process', 'pending', 'pending_review_manual'].includes(txData.status)) {
            return error(res, 'Payment is under review by Mercado Pago. Try again later.', 400, { status: 'pending_review' });
        }

        if (txData.status !== 'authorized') {
            return error(res, `Cannot capture payment with status: ${txData.status}`, 400);
        }

        const captureResponse = await PaymentService.capturePayment(txData.paymentId, providerData.mp_access_token);

        if (['approved', 'processed'].includes(captureResponse.status)) {
            await txDoc.ref.update({
                status: 'captured',
                capturedAt: new Date().toISOString()
            });

            return success(res, 'Funds released successfully', captureResponse);
        }

        return error(res, 'Capture failed at Mercado Pago', 400, { status: captureResponse.status });
    } catch (err) {
        return error(res, err.message);
    }
};

// 5. Create Preference (Wallet Brick)
const createPreference = async (req, res) => {
    try {
        const body = req.body;
        const { items, payer, userId } = body;

        const preferenceData = {
            items: items.map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price)
            })),
            payer: {
                email: payer.email,
                name: payer.first_name,
                surname: payer.last_name
            },
            /* back_urls: {
                success: `${baseUrl}/user/bookings?action=payment_success`,
                failure: `${baseUrl}/user/bookings?action=payment_failure`,
                pending: `${baseUrl}/user/bookings?action=payment_pending`
            },
            auto_return: "approved", */
            external_reference: body.external_reference
        };

        const preference = await PaymentService.createPreference(preferenceData);

        await db.collection('payments').add({
            userId: userId,
            preference: preference,
        });

        return success(res, "Preference created", { preferenceId: preference.id });
    } catch (err) {
        return error(res, err.message);
    }
};

// 6. Receive Webhook
const receiveWebhook = async (req, res) => {
    try {
        const body = req.body;

        const payment = await PaymentService.getPayment(body.data.id);

        await db.collection('payments').doc(String(payment.id)).set({
            payment: payment,
        });

        if (payment && payment.status === 'approved') {
            const externalRef = payment.external_reference;
            console.log(`[PaymentController] Payment approved for Ref: ${externalRef}`);

            // A. Check if it's an ORDER (Marketplace)
            if (externalRef && externalRef.startsWith("ORDER-")) {
                const ordersRef = db.collection('orderBookings');
                const snapshot = await ordersRef.where('checkoutGroupId', '==', externalRef).get();

                if (snapshot.empty) {
                    console.warn(`[PaymentController] No orders found for Group ID: ${externalRef}`);
                } else {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, {
                            status: 'paid',
                            isPaid: true,
                            paymentId: payment.id,
                            paidAt: new Date().toISOString()
                        });
                    });
                    await batch.commit();
                    console.log(`[PaymentController] Updated ${snapshot.size} orders for Group ID: ${externalRef}`);
                }
            }
            // B. It's a BOOKING (Service)
            else if (externalRef && externalRef !== "pending_booking") {
                const bookingRef = db.collection('bookings').doc(externalRef);
                await bookingRef.update({
                    status: 'pending', // Set to confirmed/pending provider
                    isPaid: true,
                    paymentId: payment.id,
                    paidAt: new Date().toISOString()
                });
                console.log(`[PaymentController] Booking ${externalRef} updated to 'pending'.`);
            }
        }

        // Always return 200 to MP to prevent retries
        return res.status(200).send("OK");
    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(200).send("OK"); // Respond OK even on error to stop MP retries
    }
}

module.exports = { authorize, connect, createPayment, cancelPayment, refundPayment, capturePayment, createPreference, receiveWebhook };
