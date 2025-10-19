const flightService = require('../services/flight.service');

// Search flights
exports.searchFlights = async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
      children,
      travelClass,
      currency,
      nonStop
    } = req.query;

    // Validation
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and departure date are required'
      });
    }

    const searchParams = {
      origin,
      destination,
      departureDate,
      returnDate,
      adults: parseInt(adults) || 1,
      children: children ? parseInt(children) : undefined,
      travelClass,
      currency: currency || 'NGN',
      nonStop: nonStop === 'true'
    };

    const results = await flightService.searchFlights(searchParams);

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// Get flight price
exports.getFlightPrice = async (req, res, next) => {
  try {
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Has flightOffer key?', 'flightOffer' in req.body);
    console.log('Keys in body:', Object.keys(req.body));
    
    const { flightOffer } = req.body;

    if (!flightOffer) {
      return res.status(400).json({
        success: false,
        message: 'Flight offer is required',
        receivedKeys: Object.keys(req.body)
      });
    }

    const result = await flightService.getFlightPrice(flightOffer);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Search airports
exports.searchAirports = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Keyword must be at least 3 characters'
      });
    }

    const results = await flightService.searchAirports(keyword);

    res.json(results);
  } catch (error) {
    next(error);
  }
};