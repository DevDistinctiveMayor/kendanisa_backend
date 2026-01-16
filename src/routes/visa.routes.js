// src/routes/visa.routes.js
const express = require("express");
const router = express.Router();
// const nodemailer = require('nodemailer'); // kept for future/local use (commented)
const Sib = require("sib-api-v3-sdk");
const rateLimit = require("express-rate-limit");

/**
 * Visa & Documentation route
 * - Uses Brevo (sib-api-v3-sdk) by default (Render-friendly)
 * - SMTP (nodemailer) is left commented for local testing if needed
 */

/* Rate limit: Max 5 requests per IP per hour */
const visaRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many visa requests from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ---------------------------
   (Optional) Nodemailer SMTP (commented)
   Uncomment if you want to use SMTP locally.
----------------------------*/
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
//       rejectUnauthorized: process.env.NODE_ENV === "production",
//     },
//   });
// };

/* Initialize Brevo (sib-api-v3-sdk) */
const client = Sib.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new Sib.TransactionalEmailsApi();

/* POST /api/visa-request */
router.post("/visa-request", visaRequestLimiter, async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      serviceType,
      destinationCountry,
      preferredContactMethod,
      message,
    } = req.body;

    // Basic validation
    if (!fullName || !email || !phone || !serviceType) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    // Validate email basic format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // NOTE:
    // We are NOT creating/verifying an SMTP transporter here because this route uses Brevo API.
    // If you want to use SMTP locally, uncomment createTransporter() (above) and the SMTP send block below.

    const referenceNumber = `VR-${Date.now().toString().slice(-8)}`;
    const submissionDate = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
      dateStyle: "full",
      timeStyle: "short",
    });

    /* Build email HTML bodies (same as before) */
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #0E4733 0%, #037D66 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .info-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #0E4733; width: 180px; flex-shrink: 0; }
          .value { color: #374151; flex: 1; word-break: break-word; }
          .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; padding: 12px 30px; background: #037D66; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌍 New Visa/Documentation Request</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
          </div>
          
          <div class="content">
            <div class="urgent">
              <strong>⏰ Priority:</strong> Please contact <strong>${fullName}</strong> within 24 hours about their ${serviceType}.
            </div>

            <div class="info-card">
              <div class="info-row"><div class="label">Full Name:</div><div class="value">${fullName}</div></div>
              <div class="info-row"><div class="label">Email:</div><div class="value">${email}</div></div>
              <div class="info-row"><div class="label">Phone:</div><div class="value">${phone}</div></div>
              ${
                preferredContactMethod
                  ? `<div class="info-row"><div class="label">Preferred Contact:</div><div class="value">${preferredContactMethod}</div></div>`
                  : ""
              }
              <div class="info-row"><div class="label">Service Type:</div><div class="value">${serviceType}</div></div>
              ${
                destinationCountry
                  ? `<div class="info-row"><div class="label">Destination:</div><div class="value">${destinationCountry}</div></div>`
                  : ""
              }
              <div class="info-row"><div class="label">Reference Number:</div><div class="value">${referenceNumber}</div></div>
              <div class="info-row"><div class="label">Submission Date:</div><div class="value">${submissionDate}</div></div>
            </div>

            ${
              message
                ? `<div class="info-card"><div class="label">Message:</div><div class="value">${message}</div></div>`
                : ""
            }

            <div style="text-align:center; margin-top:30px;">
              <a href="mailto:${email}" class="button">Reply to Client</a>
            </div>
          </div>

          <div style="text-align:center; padding:20px; color:#6b7280;">
            <p><strong>${
              process.env.COMPANY_NAME || "Kendanisa Travel"
            }</strong></p>
            <p>Automated notification from visa request form</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const clientHtml = `
      <!DOCTYPE html>
      <html>
      <head><style>
        body { font-family:'Segoe UI',Arial,sans-serif; line-height:1.6; color:#333; margin:0; padding:0;}
        .container {max-width:600px;margin:0 auto;background:#fff;}
        .header {background:linear-gradient(135deg,#0E4733 0%,#037D66 100%);color:white;padding:40px 30px;text-align:center;}
        .content {padding:30px;background:#f9fafb;}
        .info {background:white;padding:20px;border-radius:8px;margin-top:10px;}
        a {color:#037D66;text-decoration:none;}
      </style></head>
      <body>
        <div class="container">
          <div class="header"><h1>✈️ Thank You, ${
            fullName.split(" ")[0]
          }!</h1></div>
          <div class="content">
            <p>Dear ${fullName},</p>
            <p>We have received your <strong>${serviceType}</strong> request and will contact you soon.</p>
            <div class="info">
              <p><strong>Reference Number:</strong> ${referenceNumber}</p>
              <p><strong>Destination:</strong> ${
                destinationCountry || "N/A"
              }</p>
              <p><strong>Preferred Contact:</strong> ${
                preferredContactMethod || "Email"
              }</p>
            </div>
            <p>Warm regards,<br><strong>${
              process.env.COMPANY_NAME || "Kendanisa Travel"
            }</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    /* ----------------------------
       Send via Brevo API (transactional)
       ---------------------------- */

    // await Promise.all([
    //   transporter.sendMail(adminMailOptions),
    //   transporter.sendMail(clientMailOptions)
    // ]);
    await Promise.all([
      tranEmailApi.sendTransacEmail({
        sender: {
          email: process.env.VISA_EMAIL || "travels@kendanisaconsultingltd.com",
          name: process.env.COMPANY_NAME || "Kendanisa Travel",
        },
        to: [
          {
            email:
              process.env.VISA_EMAIL || "travels@kendanisaconsultingltd.com",
            name: "Visa Team",
          },
        ],
        subject: `🌍 New Visa/Documentation Request - ${serviceType}`,
        htmlContent: adminHtml,
      }),
      tranEmailApi.sendTransacEmail({
        sender: {
          email: process.env.VISA_EMAIL || "travels@kendanisaconsultingltd.com",
          name: process.env.COMPANY_NAME || "Kendanisa Travel",
        },
        to: [{ email, name: fullName }],
        subject: "✈️ Your Visa/Documentation Request Has Been Received!",
        htmlContent: clientHtml,
      }),
    ]);
    console.log(`✅ Visa request email sent from ${email} (${serviceType})`);

    return res.status(200).json({
      success: true,
      message: "Visa request sent successfully",
      data: { referenceNumber, email, serviceType },
    });
  } catch (error) {
    console.error(
      "❌ Visa request error:",
      error && error.message ? error.message : error
    );
    // Helpful debug output for Brevo errors (keeps logs readable)
    if (error && error.response && error.response.body) {
      console.error("Brevo response body:", error.response.body);
    }

    // If you had SMTP enabled and got authentication errors, you'd detect EAUTH here.
    if (error && error.code === "EAUTH") {
      return res.status(500).json({
        success: false,
        message: "Email authentication failed. Check SMTP credentials.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send visa request. Please try again later.",
      error: error && error.message ? error.message : undefined,
    });
  }
});

module.exports = router;
