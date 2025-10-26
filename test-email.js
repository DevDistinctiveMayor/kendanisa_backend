const Sib = require('sib-api-v3-sdk');
require('dotenv').config();

async function testBrevo() {
  try {
    // Initialize Brevo client
    const client = Sib.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const tranEmailApi = new Sib.TransactionalEmailsApi();

    console.log('🔍 Verifying Brevo API key...');

    // Try to send a test email
    const response = await tranEmailApi.sendTransacEmail({
      sender: { email: 'info@ouragent.com.ng', name: process.env.COMPANY_NAME || 'Kendanisa' },
      to: [{ email: process.env.ADMIN_EMAIL }],
      subject: '✅ Brevo API Test - Contact Form',
      htmlContent: `
        <html>
          <body style="font-family:Arial, sans-serif; background:#f9fafb; padding:20px;">
            <div style="max-width:600px; margin:auto; background:white; border-radius:10px; padding:20px;">
              <h2 style="color:#037D66;">Brevo API Test Successful 🎉</h2>
              <p>Your Brevo configuration is working correctly.</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}</p>
            </div>
          </body>
        </html>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('📩 Message ID:', response.messageId || 'N/A');
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    if (error.response && error.response.text) {
      console.error('Details:', error.response.text);
    }
  }
}

testBrevo();
