import nodemailer from 'nodemailer';
import { store } from '../models/store.js';

export const createEmailTransporter = () => {
  const settings = store.getSystemSettings()?.smtp || {};

  return nodemailer.createTransport({
    host: settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(settings.smtpPort || process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: settings.smtpUser || process.env.SMTP_USER || 'globalinfotechindia07@gmail.com',
      pass: settings.smtpPass || process.env.SMTP_PASS || 'milp oeru ubrf grtm',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const sendOtpNotificationEmail = async (toEmail, otpCode, userName = 'Broker User') => {
  try {
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: `"BrokerSim Notifications" <${process.env.SMTP_USER || 'globalinfotechindia07@gmail.com'}>`,
      to: toEmail,
      subject: '🔑 Your Security OTP Code - BrokerSim Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #2563eb; margin-bottom: 10px;">BrokerSim Verification Code</h2>
          <p style="color: #475569; font-size: 14px;">Hello <strong>${userName}</strong>,</p>
          <p style="color: #475569; font-size: 14px;">Your One-Time Password (OTP) for account verification and subscription authorization is:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0f172a; margin: 20px 0;">
            ${otpCode}
          </div>
          <p style="color: #64748b; font-size: 12px;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center;">© 2026 BrokerSim Platform Engine. All rights reserved.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent Successfully]: MessageID ${info.messageId} to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Error]:`, error.message);
    return { success: false, error: error.message };
  }
};
