import nodemailer from 'nodemailer';
import config from '../config.js';
import { logger } from '../utils/logger.js';

let mailtrapTransporter = null;

const getMailtrapTransporter = () => {
  if (!mailtrapTransporter && config.emailServiceUrl) {
    mailtrapTransporter = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: '2d81f592c63af7',
        pass: 'a8a4141035de47'
      }
    });
  }
  return mailtrapTransporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (config.emailProvider === 'mailtrap') {
      const transporter = getMailtrapTransporter();

      if (!transporter) {
        logger.warn('email.service.not_configured', { to });
        return { success: false, error: 'Mailtrap not configured' };
      }

      const info = await transporter.sendMail({
        from: config.emailFrom || 'EatWisely <noreply@eatwisely.com>',
        to,
        subject,
        html,
        text
      });

      logger.info('email.sent', { to, subject, provider: 'mailtrap', messageId: info.messageId });
      return { success: true, messageId: info.messageId, provider: 'mailtrap' };
    }

    if (config.emailProvider === 'resend' && config.resendApiKey) {
      const axios = await import('axios');
      const response = await axios.default.post(
        'https://api.resend.com/emails',
        {
          from: config.emailFrom || 'EatWisely <noreply@resend.dev>',
          to: [to],
          subject,
          html,
          text
        },
        {
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      logger.info('email.sent', { to, subject, provider: 'resend' });
      return { success: true, messageId: response.data?.id, provider: 'resend' };
    }

    logger.warn('email.service.not_configured', { to });
    return { success: false, error: 'No email provider configured' };

  } catch (error) {
    logger.error('email.send_failed', { to, subject, error: error.message });
    return { success: false, error: error.message };
  }
};

export const sendPasswordResetEmail = async ({ to, resetToken, userId }) => {
  const resetUrl = `${config.clientUrl || 'http://localhost:5173'}/reset-password?token=${resetToken}&userId=${userId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #8fa31e; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">EatWisely</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #666; line-height: 1.6;">
          You requested to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #8fa31e; color: white; padding: 14px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; line-height: 1.6;">
          This link will expire in 1 hour. If you didn't request a password reset, 
          please ignore this email or contact support if you have concerns.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; word-break: break-all;">
          Or copy this link to your browser: <a href="${resetUrl}" style="color: #8fa31e;">${resetUrl.length > 50 ? resetUrl.substring(0, 50) + '...' : resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const text = `You requested to reset your password. Click here: ${resetUrl}. This link expires in 1 hour.`;

  return sendEmail({ to, subject: 'Password Reset - EatWisely', html, text });
};
