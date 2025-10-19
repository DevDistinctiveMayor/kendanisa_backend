const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kendanisa Travel API',
      version: '1.0.0',
      description: 'Flight booking and travel management API with Amadeus integration and Paystack payments',
      contact: {
        name: 'API Support',
        email: 'support@kendanisa.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.kendanisa.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'consultant', 'admin'] }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            bookingReference: { type: 'string' },
            userId: { type: 'string' },
            flightDetails: {
              type: 'object',
              properties: {
                origin: { type: 'string' },
                destination: { type: 'string' },
                departureDate: { type: 'string', format: 'date-time' },
                returnDate: { type: 'string', format: 'date-time' },
                airline: { type: 'string' },
                flightNumber: { type: 'string' },
                class: { type: 'string' },
                duration: { type: 'string' }
              }
            },
            passengers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date' },
                  passportNumber: { type: 'string' },
                  passportExpiry: { type: 'string', format: 'date' },
                  nationality: { type: 'string' }
                }
              }
            },
            pricing: {
              type: 'object',
              properties: {
                basePrice: { type: 'number' },
                taxes: { type: 'number' },
                total: { type: 'number' },
                currency: { type: 'string' }
              }
            },
            status: { 
              type: 'string', 
              enum: ['pending', 'confirmed', 'cancelled', 'completed'] 
            },
            paymentStatus: { 
              type: 'string', 
              enum: ['pending', 'paid', 'failed', 'refunded'] 
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;