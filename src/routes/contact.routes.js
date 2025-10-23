const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Handle general contact or inquiry messages
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags: [Contact]
 *     summary: Submit a general contact message
 *     description: Sends a contact message to the admin and confirmation to the client.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               message:
 *                 type: string
 *                 example: "I’d like to know more about your travel packages."
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */

// Rate limit: Max 5 contact messages per IP per hour
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many contact requests from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465, // ✅ Use SSL port
    secure: true, // ✅ Use SSL for Gmail
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};


// // Create transporter
// const createTransporter = () => {
//   return nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: parseInt(process.env.SMTP_PORT) || 587,
//     secure: false,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//     tls: {
//       rejectUnauthorized: process.env.NODE_ENV === 'production'
//     }
//   });
// };

// POST /api/contact
router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const transporter = createTransporter();
    await transporter.verify();

    const referenceNumber = `CT-${Date.now().toString().slice(-8)}`;
    const submissionDate = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // ✅ Email to Admin
    const adminMailOptions = {
      from: `"${process.env.COMPANY_NAME || 'Kendanisa Travel'}" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `📩 New Contact Message from ${name}`,
      html: `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; }
              .header { background: #037D66; color: #fff; padding: 25px; text-align: center; }
              .content { padding: 20px; background: #f9fafb; }
              .info-row { margin: 10px 0; }
              .label { font-weight: 600; color: #0E4733; }
              .footer { text-align: center; color: #6b7280; padding: 15px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>📩 New Contact Message</h2>
              </div>
              <div class="content">
                <div class="info-row"><span class="label">Name:</span> ${name}</div>
                <div class="info-row"><span class="label">Email:</span> ${email}</div>
                <div class="info-row"><span class="label">Reference:</span> ${referenceNumber}</div>
                <div class="info-row"><span class="label">Date:</span> ${submissionDate}</div>
                <hr/>
                <div class="info-row"><span class="label">Message:</span><br>${message}</div>
              </div>
              <div class="footer">
                <p>${process.env.COMPANY_NAME || 'Kendanisa Travel'} | Automated Notification</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    // ✅ Email to Client (Confirmation)
    const clientMailOptions = {
      from: `"${process.env.COMPANY_NAME || 'Kendanisa Travel'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '✅ We’ve received your message!',
      html: `
        <html>
          <head><style>
            body { font-family:'Segoe UI',Arial,sans-serif; line-height:1.6; color:#333; margin:0; padding:0;}
            .container {max-width:600px;margin:auto;background:#fff;}
            .header {background:#037D66;color:white;padding:30px;text-align:center;}
            .content {padding:25px;background:#f9fafb;}
            .info {background:white;padding:15px;border-radius:8px;margin-top:10px;}
            a {color:#037D66;text-decoration:none;}
          </style></head>
          <body>
            <div class="container">
              <div class="header"><h2>Thank You, ${name.split(' ')[0]}!</h2></div>
              <div class="content">
                <p>We’ve received your message and our team will get back to you shortly.</p>
                <div class="info">
                  <p><strong>Reference Number:</strong> ${referenceNumber}</p>
                  <p><strong>Date:</strong> ${submissionDate}</p>
                </div>
                <p>Warm regards,<br><strong>${process.env.COMPANY_NAME || 'Kendanisa Travel'}</strong></p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    // ✅ Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(clientMailOptions),
    ]);

    console.log(`✅ Contact message sent from ${email}`);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: { referenceNumber, email },
    });
  } catch (error) {
    console.error('❌ Contact form error:', error);
    if (error.code === 'EAUTH') {
      return res.status(500).json({
        success: false,
        message: 'Email authentication failed. Check SMTP credentials.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
    });
  }
});

module.exports = router;
