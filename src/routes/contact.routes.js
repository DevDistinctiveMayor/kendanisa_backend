const express = require('express');
const router = express.Router();
const Sib = require('sib-api-v3-sdk');
const rateLimit = require('express-rate-limit');

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Handle general contact or inquiry messages
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

// Initialize Brevo API client
const client = Sib.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new Sib.TransactionalEmailsApi();

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

    const referenceNumber = `CT-${Date.now().toString().slice(-8)}`;
    const submissionDate = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // ✅ Email to Admin
    const adminMail = {
      sender: { email: 'info@ouragent.com.ng', name: process.env.COMPANY_NAME || 'Kendanisa Travel' },
      to: [{ email: process.env.ADMIN_EMAIL }],
      subject: `📩 New Contact Message from ${name}`,
      htmlContent: `
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
      `
    };

    // ✅ Email to Client (Confirmation)
    const clientMail = {
      sender: { email: 'info@ouragent.com.ng', name: process.env.COMPANY_NAME || 'Kendanisa Travel' },
      to: [{ email }],
      subject: '✅ We’ve received your message!',
      htmlContent: `
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
      `
    };

    // ✅ Send both emails via Brevo API
    await Promise.all([
      tranEmailApi.sendTransacEmail(adminMail),
      tranEmailApi.sendTransacEmail(clientMail)
    ]);




    console.log(`✅ Contact message sent from ${email}`);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: { referenceNumber, email },
    });

  } catch (error) {
    console.error('❌ Contact form error:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: error.message,
    });
  }
});

module.exports = router;
