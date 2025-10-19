const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified!');
    
    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test Email - Consultation Form',
      html: '<h1>Success!</h1><p>Your email configuration is working correctly.</p>',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your email and password.');
    }
  }
}

testEmail();