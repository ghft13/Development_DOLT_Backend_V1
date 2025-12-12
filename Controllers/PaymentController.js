const { db } = require('../Config/FireBase.js');
const PaymentService = require('../Services/PaymentService');

/**
 * PaymentController
 * Handles HTTP requests for Payment operations.
 * Implements "Fail Fast" (Guard Clauses) pattern.
 */

// --- Helper Functions ---
const sendSuccess = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const sendError = (res, message, statusCode = 500, error = null) => {
    const response = {
        success: false,
        message
    };
    if (error && process.env.NODE_ENV !== 'production') {
        response.details = error.message || error;
    }

    return res.status(statusCode).json(response);
};

// --- Controller Methods ---

// 1. Authorize: Generate OAuth URL
const authorize = async (req, res) => {
    try {
        const { providerId } = req.query;

        if (!providerId) {
            return sendError(res, 'providerId is required', 400);
        }

        const authUrl = PaymentService.getAuthorizationURL(providerId);
        return sendSuccess(res, 'Authorization URL generated', { authUrl });

    } catch (error) {
        console.error('[PaymentController] Authorize Error:', error.message);
        return sendError(res, error.message);
    }
};

// 2. Connect: Link Provider Account
const connect = async (req, res) => {
    try {
        const { code, state } = req.query; // state = providerId

        if (!code || !state) {
            return sendError(res, 'Missing authorization code or state', 400);
        }

        const credentials = await PaymentService.createProviderConnection(code);

        await db.collection('providers').doc(state).set({
            mp_access_token: credentials.access_token,
            mp_refresh_token: credentials.refresh_token,
            mp_user_id: credentials.user_id,
            mp_public_key: credentials.public_key,
            mp_connected_at: new Date().toISOString(),
            mp_connected: true
        }, { merge: true });

        return sendSuccess(res, 'Provider connected successfully', { user_id: credentials.user_id });

    } catch (error) {
        console.error('[PaymentController] Connect Error:', error.message);
        return sendError(res, error.message);
    }
};

// 3. Create Payment Intent
const createPayment = async (req, res) => {
    try {
        const body = req.body;
        const { platformFeePercent = 10, providerId } = body;

        if (!providerId) {
            return sendError(res, "providerId is required in the request body", 400);
        }

        const providerDoc = await db.collection('providers').doc(providerId).get();
        if (!providerDoc.exists) {
            return sendError(res, 'Provider not found', 404);
        }

        const providerData = providerDoc.data();
        if (!providerData?.mp_access_token) {
            return sendError(res, 'Provider is not connected to Mercado Pago', 400);
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
            providerAccessToken: providerData.mp_access_token,
            applicationFee,
            description: body.description || `Service with provider ${providerId}`,
            externalReference: body.external_reference
        });

        const validStatuses = ['authorized', 'in_process', 'pending', 'approved'];

        if (!validStatuses.includes(paymentResponse.status)) {
            return sendError(res, 'Payment Unauthorized', 400, {
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
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        });

        return sendSuccess(res, 'Payment Authorized', {
            paymentId: paymentResponse.id,
            escrowCode: escrowCode,
            transactionId: transactionRef.id,
            status: paymentResponse.status,
            status_detail: paymentResponse.status_detail
        });

    } catch (error) {
        console.error('[PaymentController] Create Payment Error:', error.message);
        return sendError(res, error.message, 500, error);
    }
};

// 4. Capture Payment (Release Funds)
const capturePayment = async (req, res) => {
    try {
        const { paymentId, escrowCode } = req.body;

        if (!paymentId || !escrowCode) {
            return sendError(res, 'Missing paymentId or escrowCode', 400);
        }

        let txQuery = await db.collection('transactions').where('paymentId', '==', parseInt(paymentId)).get();
        if (txQuery.empty) txQuery = await db.collection('transactions').where('paymentId', '==', String(paymentId)).get();

        if (txQuery.empty) {
            return sendError(res, 'Transaction not found', 404);
        }

        const txDoc = txQuery.docs[0];
        const txData = txDoc.data();

        if (txData.status === 'captured') {
            return sendSuccess(res, 'Payment already captured');
        }

        if (txData.escrowCode !== escrowCode) {
            return sendError(res, 'Invalid Verification Code', 403);
        }

        if (['in_process', 'pending', 'pending_review_manual'].includes(txData.status)) {
            return sendError(res, 'Payment is under review by Mercado Pago. Try again later.', 400, { status: 'pending_review' });
        }

        if (txData.status !== 'authorized') {
            return sendError(res, `Cannot capture payment with status: ${txData.status}`, 400);
        }

        const providerDoc = await db.collection('providers').doc(txData.providerId).get();
        if (!providerDoc.exists) {
            return sendError(res, 'Provider data missing', 404);
        }

        const providerData = providerDoc.data();
        const captureResponse = await PaymentService.capturePayment(txData.paymentId, providerData.mp_access_token);

        if (['approved', 'processed'].includes(captureResponse.status)) {
            await txDoc.ref.update({
                status: 'captured',
                capturedAt: new Date().toISOString()
            });
            return sendSuccess(res, 'Funds released successfully', captureResponse);
        }

        return sendError(res, 'Capture failed at Mercado Pago', 400, { status: captureResponse.status });

    } catch (error) {
        console.error('[PaymentController] Capture Payment Error:', error.message);
        return sendError(res, error.message);
    }
};

module.exports = { createPayment, capturePayment, authorize, connect };
