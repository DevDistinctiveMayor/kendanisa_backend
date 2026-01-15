const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
const connectDB = require('./src/config/database');
const errorHandler = require('./src/middleware/error.middleware');
require('dotenv').config();

const app = express();

// ✅ Tell Express to trust the proxy (important for Render, Vercel, etc.)
app.set('trust proxy', 1);

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());

// Webhook route MUST come before express.json()
app.use('/api/payments/webhook', require('./src/routes/payment.routes'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Kendanisa API Docs'
}));

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Kendanisa Travel API',
    documentation: '/api-docs',
    version: '1.0.0',
    status: 'active'
  });
});

// API Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/flights', require('./src/routes/flight.routes'));
app.use('/api/bookings', require('./src/routes/booking.routes'));
app.use('/api/payments', require('./src/routes/payment.routes'));
app.use('/api', require('./src/routes/visa.routes')); // ✅ visa route
app.use('/api', require('./src/routes/contact.routes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📚 API Docs: http://0.0.0.0:${PORT}/api-docs`);
  console.log(`🏥 Health: http://0.0.0.0:${PORT}/health`);
});

// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
//   console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
//   console.log(`🏥 Health: http://localhost:${PORT}/health`);
// });