export function passwordResetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: #333333;
        background-color: #f8f8f8;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 40px 20px;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #ea580c;
        margin-bottom: 10px;
      }
      .content {
        margin-bottom: 30px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 15px;
      }
      .text {
        font-size: 14px;
        color: #555555;
        margin-bottom: 15px;
      }
      .warning {
        background-color: #fff3cd;
        border-left: 4px solid #ea580c;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
        font-size: 13px;
        color: #333333;
      }
      .warning-icon {
        color: #ea580c;
        font-weight: bold;
        margin-right: 8px;
      }
      .cta-button {
        display: inline-block;
        background-color: #ea580c;
        color: #ffffff;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        margin-top: 20px;
        margin-bottom: 20px;
      }
      .cta-button:hover {
        background-color: #d64a07;
      }
      .reset-link {
        background-color: #f8f8f8;
        padding: 15px;
        border-radius: 6px;
        word-break: break-all;
        font-size: 12px;
        color: #666666;
        margin: 20px 0;
        font-family: 'Courier New', monospace;
      }
      .footer {
        border-top: 1px solid #e0e0e0;
        padding-top: 20px;
        text-align: center;
        font-size: 12px;
        color: #999999;
      }
      .divider {
        height: 1px;
        background-color: #e0e0e0;
        margin: 30px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">🏁 RaceDayAI</div>
        <p style="color: #ea580c; margin: 0; font-size: 14px;">Password Reset Request</p>
      </div>

      <div class="content">
        <div class="greeting">Password Reset Request</div>

        <p class="text">
          We received a request to reset the password for your RaceDayAI account. If you didn't make this request, you can safely ignore this email.
        </p>

        <div class="warning">
          <span class="warning-icon">⏱</span>
          This reset link expires in <strong>1 hour</strong>. Please use it soon!
        </div>

        <p style="text-align: center;">
          <a href="${resetUrl}" class="cta-button">Reset Your Password</a>
        </p>

        <p class="text" style="font-size: 12px; color: #999999;">
          Or copy and paste this link in your browser:
        </p>
        <div class="reset-link">${resetUrl}</div>

        <div class="divider"></div>

        <p class="text" style="font-size: 13px;">
          <strong>Didn't request a password reset?</strong> Your account is secure. If you didn't request this email, please ignore it. Your password remains unchanged.
        </p>

        <p class="text" style="font-size: 13px;">
          For security reasons, we never share your password or send it via email. If you have concerns about your account security, please contact our support team.
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0;">
          RaceDayAI © 2025 | <a href="https://racedayai.vercel.app" style="color: #ea580c; text-decoration: none;">Visit our website</a>
        </p>
      </div>
    </div>
  </body>
</html>`;
}
