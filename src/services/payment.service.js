const axios = require('axios');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

class PaymentService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = 'https://api.paystack.co';
  }

  async initializePayment(bookingId, userId) {
    try {
      const booking = await Booking.findById(bookingId).populate('userId');
      
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.userId._id.toString() !== userId) {
        throw new Error('Unauthorized');
      }

      if (booking.paymentStatus === 'paid') {
        throw new Error('Booking already paid');
      }

      // Initialize Paystack payment
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          email: booking.userId.email,
          amount: Math.round(booking.pricing.total * 100), // Convert to kobo
          currency: booking.pricing.currency,
          reference: `${booking.bookingReference}_${Date.now()}`,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingReference,
            custom_fields: [
              {
                display_name: "Booking Reference",
                variable_name: "booking_reference",
                value: booking.bookingReference
              },
              {
                display_name: "Flight Route",
                variable_name: "flight_route",
                value: `${booking.flightDetails.origin} to ${booking.flightDetails.destination}`
              }
            ]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Create payment record
      const payment = new Payment({
        bookingId: booking._id,
        amount: booking.pricing.total,
        currency: booking.pricing.currency,
        paymentMethod: 'paystack',
        paymentIntentId: response.data.data.reference,
        status: 'pending'
      });

      await payment.save();

      // Update booking
      booking.paymentId = response.data.data.reference;
      await booking.save();

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference
      };
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Payment initialization failed');
    }
  }

  async verifyPayment(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`
          }
        }
      );

      const paymentData = response.data.data;

      if (paymentData.status === 'success') {
        await this.handlePaymentSuccess(paymentData);
      } else {
        await this.handlePaymentFailure(paymentData);
      }

      return paymentData;
    } catch (error) {
      console.error('Payment verification error:', error.response?.data || error);
      throw new Error('Payment verification failed');
    }
  }

  async handleWebhook(event) {
    try {
      const { event: eventType, data } = event;

      switch (eventType) {
        case 'charge.success':
          await this.handlePaymentSuccess(data);
          break;
        
        case 'charge.failed':
          await this.handlePaymentFailure(data);
          break;
        
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  async handlePaymentSuccess(paymentData) {
    const payment = await Payment.findOne({ 
      paymentIntentId: paymentData.reference 
    });

    if (payment) {
      payment.status = 'completed';
      payment.transactionId = paymentData.reference;
      await payment.save();

      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        await booking.save();

        console.log(`Booking ${booking.bookingReference} payment confirmed`);
        // TODO: Send confirmation email
      }
    }
  }

  async handlePaymentFailure(paymentData) {
    const payment = await Payment.findOne({ 
      paymentIntentId: paymentData.reference 
    });

    if (payment) {
      payment.status = 'failed';
      await payment.save();

      const booking = await Booking.findById(payment.bookingId);
      if (booking) {
        booking.paymentStatus = 'failed';
        await booking.save();
      }
    }
  }

  async getPaymentStatus(bookingId) {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    const payment = await Payment.findOne({ bookingId });

    return {
      bookingReference: booking.bookingReference,
      paymentStatus: booking.paymentStatus,
      payment: payment || null
    };
  }
}

module.exports = new PaymentService();