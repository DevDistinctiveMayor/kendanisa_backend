const express = require('express');
const router = express.Router();
const {
  searchFlights,
  getFlightPrice,
  searchAirports
} = require('../controllers/flight.controller');

/**
 * @swagger
 * /api/flights/search:
 *   get:
 *     tags: [Flights]
 *     summary: Search for flights
 *     description: Search available flights using Amadeus API
 *     parameters:
 *       - in: query
 *         name: origin
 *         required: true
 *         schema:
 *           type: string
 *         description: Origin airport code (e.g., LOS)
 *       - in: query
 *         name: destination
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination airport code (e.g., LHR)
 *       - in: query
 *         name: departureDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Departure date (YYYY-MM-DD)
 *       - in: query
 *         name: returnDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Return date for round trip
 *       - in: query
 *         name: adults
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Number of adult passengers
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *         description: Number of child passengers
 *       - in: query
 *         name: travelClass
 *         schema:
 *           type: string
 *           enum: [ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST]
 *         description: Travel class
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           default: NGN
 *         description: Currency code
 *       - in: query
 *         name: nonStop
 *         schema:
 *           type: boolean
 *         description: Only non-stop flights
 *     responses:
 *       200:
 *         description: Flight search results
 *       400:
 *         description: Missing required parameters
 */
router.get('/search', searchFlights);

/**
 * @swagger
 * /api/flights/airports:
 *   get:
 *     tags: [Flights]
 *     summary: Search airports
 *     description: Search for airports by keyword
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *         description: Search keyword (city or airport name)
 *     responses:
 *       200:
 *         description: Airport search results
 */
router.get('/airports', searchAirports);

/**
 * @swagger
 * /api/flights/price:
 *   post:
 *     tags: [Flights]
 *     summary: Get flight price
 *     description: Get updated price for a specific flight offer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flightOffer:
 *                 type: object
 *                 description: Flight offer object from search results
 *     responses:
 *       200:
 *         description: Updated flight price
 */
router.post('/price', getFlightPrice);

module.exports = router;