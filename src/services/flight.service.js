const axios = require('axios');

class FlightService {
  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.baseURL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/security/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 30 minutes from now (token valid for 30 min)
      this.tokenExpiry = Date.now() + (29 * 60 * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Amadeus auth error:', error.response?.data);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  async searchFlights(searchParams) {
    const token = await this.getAccessToken();

    const params = {
      originLocationCode: searchParams.origin,
      destinationLocationCode: searchParams.destination,
      departureDate: searchParams.departureDate,
      adults: searchParams.adults || 1,
      currencyCode: searchParams.currency || 'NGN',
      max: searchParams.max || 50
    };

    // Add optional parameters
    if (searchParams.returnDate) {
      params.returnDate = searchParams.returnDate;
    }
    if (searchParams.children) {
      params.children = searchParams.children;
    }
    if (searchParams.travelClass) {
      params.travelClass = searchParams.travelClass; // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
    }
    if (searchParams.nonStop !== undefined) {
      params.nonStop = searchParams.nonStop;
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/v2/shopping/flight-offers`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta,
        dictionaries: response.data.dictionaries
      };
    } catch (error) {
      console.error('Flight search error:', error.response?.data);
      throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to search flights');
    }
  }

 async getFlightPrice(flightOffers) {
  const token = await this.getAccessToken();

  try {
    const response = await axios.post(
      `${this.baseURL}/v1/shopping/flight-offers/pricing`,
      {
        data: {
          type: 'flight-offers-pricing',
          flightOffers: Array.isArray(flightOffers) ? flightOffers : [flightOffers]
        }
      },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    // Log the full error details
    console.error('Flight pricing error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Return the actual error from Amadeus
    const errorMessage = error.response?.data?.errors?.[0]?.detail 
      || error.response?.data?.errors?.[0]?.title
      || 'Failed to get flight price';
    
    throw new Error(errorMessage);
  }
}
  async searchAirports(keyword) {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.baseURL}/v1/reference-data/locations`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            keyword,
            subType: 'AIRPORT,CITY'
          }
        }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Airport search error:', error.response?.data);
      throw new Error('Failed to search airports');
    }
  }
}

module.exports = new FlightService();