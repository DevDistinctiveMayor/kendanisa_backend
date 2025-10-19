const paymentService = require('../services/payment.service');
const crypto = require('crypto');

// Initialize payment
exports.initializePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    const paymentData = await paymentService.initializePayment(bookingId, req.user.id);

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: paymentData
    });
  } catch (error) {
    next(error);
  }
};

// Verify payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const paymentData = await paymentService.verifyPayment(reference);

    res.json({
      success: true,
      data: paymentData
    });
  } catch (error) {
    next(error);
  }
};

// Handle Paystack webhooks
exports.handleWebhook = async (req, res) => {
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  try {
    await paymentService.handleWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const status = await paymentService.getPaymentStatus(bookingId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};