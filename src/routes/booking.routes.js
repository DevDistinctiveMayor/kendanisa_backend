const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBooking,
  getBookingByReference,
  cancelBooking,
  getAllBookings
} = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Protected routes - require authentication
router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/reference/:reference', protect, getBookingByReference);
router.get('/:id', protect, getBooking);
router.patch('/:id/cancel', protect, cancelBooking);

// Admin only routes
router.get('/admin/all', protect, authorize('admin'), getAllBookings);

module.exports = router;