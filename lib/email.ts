/**
 * Email sender using AhaSend API.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const apiKey = process.env.AHASEND_API_KEY;
  const accountId = process.env.AHASEND_ACCOUNT_ID;
  const fromDomain = process.env.EMAIL_FROM_DOMAIN || 'authmail.kilonovaventures.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Kilonova LLM Council';

  if (!apiKey) {
    console.error('AHASEND_API_KEY is not configured');
    throw new Error('Email service not configured');
  }

  if (!accountId) {
    console.error('AHASEND_ACCOUNT_ID is not configured');
    throw new Error('Email service not configured');
  }

  try {
    const response = await fetch(`https://api.ahasend.com/v2/accounts/${accountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: `noreply@${fromDomain}`,
          name: fromName,
        },
        recipients: [
          {
            email: to,
          }
        ],
        subject,
        html_content: html,
        text_content: text || html.replace(/<[^>]*>/g, ''), // Strip HTML as fallback
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AhaSend API error:', error);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send verification email to user.
 */
export async function sendVerificationEmail(email: string, verificationUrl: string) {
  const subject = 'Verify your email address';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for signing up for <strong>Kilonova LLM Council</strong>! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><span class="code">${verificationUrl}</span></p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilonova Ventures. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send password reset email to user.
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const subject = 'Reset your password';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset the password for your <strong>Kilonova LLM Council</strong> account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><span class="code">${resetUrl}</span></p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilonova Ventures. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}
