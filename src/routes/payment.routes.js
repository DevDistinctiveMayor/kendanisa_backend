const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  paystackWebhook,
  getPaymentStatus
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// Webhook route - public, no authentication
router.post('/webhook', express.json(), paystackWebhook);

// Protected routes
router.post('/initialize', protect, initiatePayment);
router.get('/verify/:reference', protect, verifyPayment);
router.get('/status/:bookingId', protect, getPaymentStatus);

module.exports = router;
