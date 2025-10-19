const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// Create a new booking
exports.createBooking = async (req, res, next) => {
  try {
    const { flightOffer, passengers } = req.body;

    // Validate required fields
    if (!flightOffer || !passengers || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Flight offer and passenger details are required'
      });
    }

    // Generate unique booking reference
    const bookingReference = `KND${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Extract flight details from the offer
    const firstItinerary = flightOffer.itineraries[0];
    const firstSegment = firstItinerary.segments[0];
    const lastSegment = firstItinerary.segments[firstItinerary.segments.length - 1];

    const booking = new Booking({
      bookingReference,
      userId: req.user.id,
      flightDetails: {
        origin: firstSegment.departure.iataCode,
        destination: lastSegment.arrival.iataCode,
        departureDate: new Date(firstSegment.departure.at),
        returnDate: flightOffer.itineraries[1] 
          ? new Date(flightOffer.itineraries[1].segments[0].departure.at)
          : null,
        airline: flightOffer.validatingAirlineCodes[0],
        flightNumber: firstSegment.number,
        class: flightOffer.travelerPricings[0].fareDetailsBySegment[0].cabin,
        duration: firstItinerary.duration
      },
      passengers: passengers.map(passenger => ({
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        email: passenger.email,
        phone: passenger.phone,
        dateOfBirth: passenger.dateOfBirth ? new Date(passenger.dateOfBirth) : null,
        passportNumber: passenger.passportNumber,
        passportExpiry: passenger.passportExpiry ? new Date(passenger.passportExpiry) : null,
        nationality: passenger.nationality
      })),
      pricing: {
        basePrice: parseFloat(flightOffer.price.base),
        taxes: parseFloat(flightOffer.price.total) - parseFloat(flightOffer.price.base),
        total: parseFloat(flightOffer.price.total),
        currency: flightOffer.price.currency
      }
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings for logged-in user
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// Get single booking by ID
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure user can only view their own bookings
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Get booking by reference
exports.getBookingByReference = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ 
      bookingReference: req.params.reference 
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure user can only view their own bookings
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ensure user can only cancel their own bookings
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all bookings
exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};