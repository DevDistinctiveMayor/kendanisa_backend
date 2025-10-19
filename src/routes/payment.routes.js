const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentStatus
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// Webhook route - NO authentication
router.post('/webhook', express.json(), handleWebhook);

// Protected routes
router.post('/initialize', protect, initializePayment);
router.get('/verify/:reference', protect, verifyPayment);
router.get('/status/:bookingId', protect, getPaymentStatus);

module.exports = router;