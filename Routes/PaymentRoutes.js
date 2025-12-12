const express = require('express');
const router = express.Router();
const { createPayment, capturePayment, authorize, connect } = require('../Controllers/PaymentController.js');

// POST /api/payments/create-payment - Create a payment intent (gateway mode)
router.post('/create-payment', createPayment);

// POST /api/payments/capture-payment - Capture authorized payment
router.post('/capture-payment', capturePayment);

// POST /api/payments/cancel-payment - Cancel authorized payment
router.post('/cancel-payment', null);

// POST /api/payments/refund-payment - Refund authorized payment
router.post('/refund-payment', null);

// GET /api/payments/oauth/authorize - Get Mercado Pago authorization URL
router.get('/oauth/authorize', authorize);

// GET /api/payments/oauth/callback - Handle OAuth callback
router.get('/oauth/callback', connect);

module.exports = router;
