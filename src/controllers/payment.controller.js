// backend/controllers/payment.controller.js
const axios = require('axios');
const Booking = require('../models/Booking');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * @desc    Initialize payment with Paystack
 * @route   POST /api/payments/initialize
 * @access  Private
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { bookingId, amount, email, currency = 'NGN' } = req.body;

    // Validate required fields
    if (!bookingId || !amount || !email) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, amount, and email are required',
      });
    }

    // Verify booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid',
      });
    }

    // Initialize payment with Paystack
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount, // Amount should already be in kobo from frontend
        currency,
        reference: `${bookingId}_${Date.now()}`, // Unique reference
        callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
        metadata: {
          bookingId,
          custom_fields: [
            {
              display_name: 'Booking ID',
              variable_name: 'booking_id',
              value: bookingId,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, access_code, reference } =
      paystackResponse.data.data;

    // Update booking with payment reference
    booking.paymentReference = reference;
    await booking.save();

    res.status(200).json({
      success: true,
      authorization_url,
      access_code,
      reference,
    });
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to initialize payment',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify payment with Paystack
 * @route   GET /api/payments/verify/:reference
 * @access  Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required',
      });
    }

    // Verify payment with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = paystackResponse.data.data;

    // Extract booking ID from metadata
    const bookingId = paymentData.metadata?.bookingId;

    if (bookingId) {
      // Update booking status
      const booking = await Booking.findById(bookingId);
      if (booking) {
        if (paymentData.status === 'success') {
          booking.paymentStatus = 'paid';
          booking.status = 'confirmed';
          booking.paymentReference = reference;
          booking.paidAt = new Date(paymentData.paid_at);
        } else {
          booking.paymentStatus = 'failed';
        }
        await booking.save();
      }
    }

    // Return payment verification details
    res.status(200).json({
      success: true,
      reference: paymentData.reference,
      amount: paymentData.amount / 100, // Convert from kobo to naira
      currency: paymentData.currency,
      status: paymentData.status,
      gateway_response: paymentData.gateway_response,
      paid_at: paymentData.paid_at,
      created_at: paymentData.created_at,
      channel: paymentData.channel,
      customer: paymentData.customer,
      authorization: paymentData.authorization,
    });
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to verify payment',
      error: error.message,
    });
  }
};

/**
 * @desc    Get payment status by booking ID
 * @route   GET /api/payments/status/:bookingId
 * @access  Private
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.status(200).json({
      success: true,
      paymentStatus: booking.paymentStatus,
      paymentReference: booking.paymentReference,
      status: booking.status,
      paidAt: booking.paidAt,
    });
  } catch (error) {
    console.error('Get payment status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message,
    });
  }
};

/**
 * @desc    Paystack Webhook - Handle payment notifications
 * @route   POST /api/payments/webhook
 * @access  Public (but verify with Paystack secret)
 */
exports.paystackWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = req.body;

    // Handle different event types
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const bookingId = metadata?.bookingId;

      if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.status = 'confirmed';
          booking.paymentReference = reference;
          booking.paidAt = new Date(event.data.paid_at);
          await booking.save();

          // TODO: Send confirmation email to customer
          console.log(`Booking ${bookingId} payment confirmed via webhook`);
        }
      }
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};