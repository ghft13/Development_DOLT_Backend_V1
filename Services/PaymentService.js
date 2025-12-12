const { MercadoPagoConfig, Payment, OAuth } = require('mercadopago');
const { randomUUID } = require("crypto");

/**
 * Service to handle all Mercado Pago interactions.
 * Follows Gateway Pattern for cleaner abstraction.
 */
class PaymentService {
    constructor() {
        if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
            console.warn("[PaymentService] Warning: MERCADO_PAGO_ACCESS_TOKEN is missing.");
        }

        this.platformClient = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
            options: { timeout: 10000 }
        });
    }

    /**
     * Generate OAuth URL for Provider Onboarding
     * @param {string} providerId - Unique identifier for the provider (used as state)
     * @returns {string} The authorization URL
     */
    getAuthorizationURL(providerId) {
        const oauth = new OAuth(this.platformClient);
        return oauth.getAuthorizationURL({
            options: {
                client_id: process.env.MERCADO_PAGO_CLIENT_ID,
                redirect_uri: process.env.MERCADO_PAGO_REDIRECT_URI,
                state: providerId
            }
        });
    }

    /**
     * Exchange Code for Provider Credentials
     * @param {string} code - The authorization code returned by MP
     * @returns {Promise<Object>} The credentials object (access_token, user_id, etc.)
     */
    async createProviderConnection(code) {
        const oauth = new OAuth(this.platformClient);
        try {
            return await oauth.create({
                body: {
                    client_id: process.env.MERCADO_PAGO_CLIENT_ID,
                    client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
                    code: code,
                    redirect_uri: process.env.MERCADO_PAGO_REDIRECT_URI
                }
            });
        } catch (error) {
            console.error("[PaymentService] OAuth Error:", error.message);
            throw new Error(`Failed to exchange code: ${error.message}`);
        }
    }

    /**
     * Create a dynamic client wrapper for a specific provider
     * @param {string} accessToken - Provider's access token
     * @returns {MercadoPagoConfig} Configured client
     */
    getProviderClient(accessToken) {
        return new MercadoPagoConfig({
            accessToken: accessToken,
            options: { timeout: 10000 }
        });
    }

    /**
     * Create Payment (Gateway Mode)
     * @param {Object} params - Payment parameters
     * @returns {Promise<Object>} The created payment object
     */
    async createPayment({
        totalAmount,
        token,
        installments,
        paymentMethodId,
        payerEmail,
        payerDoc,
        providerAccessToken,
        applicationFee,
        description,
        externalReference,
        notificationUrl
    }) {
        if (!providerAccessToken) {
            throw new Error("Provider Access Token is required for Gateway Payments");
        }

        const client = this.getProviderClient(providerAccessToken);
        const payment = new Payment(client);

        const paymentBody = {
            transaction_amount: parseFloat(totalAmount),
            token: token,
            description: description,
            installments: Number(installments) || 1,
            payment_method_id: paymentMethodId,
            payer: {
                email: payerEmail,
            },
            capture: false, // Intentional: Gateway Flow requires explicit capture
            external_reference: externalReference,
            notification_url: notificationUrl
        };

        if (applicationFee) {
            paymentBody.application_fee = parseFloat(Number(applicationFee).toFixed(2));
        }

        if (payerDoc) {
            paymentBody.payer.identification = payerDoc;
        }

        try {
            return await payment.create({
                body: paymentBody,
                requestOptions: { idempotencyKey: randomUUID() }
            });
        } catch (error) {
            console.error("[PaymentService] Create Payment Error:", error.message);
            throw error;
        }
    }

    /**
     * Capture Payment
     * @param {string} paymentId - ID of the payment to capture
     * @param {string} providerAccessToken - Token of the provider
     * @returns {Promise<Object>} The captured payment response
     */
    async capturePayment(paymentId, providerAccessToken) {
        if (!providerAccessToken) throw new Error("Provider Access Token is required for Capture");

        const client = this.getProviderClient(providerAccessToken);
        const payment = new Payment(client);

        try {
            return await payment.capture({
                id: paymentId,
                requestOptions: { idempotencyKey: randomUUID() }
            });
        } catch (error) {
            console.error("[PaymentService] Capture Error:", error.message);
            throw error;
        }
    }
}

module.exports = new PaymentService();
