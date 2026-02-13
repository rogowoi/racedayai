export function contactEmailHtml(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const subjectLabels: Record<string, string> = {
    general: "General Inquiry",
    billing: "Billing Question",
    bug: "Bug Report",
    feature: "Feature Request",
  };

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
      .label {
        font-size: 12px;
        font-weight: 600;
        color: #999999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .value {
        font-size: 14px;
        color: #333333;
        margin-bottom: 16px;
      }
      .message-box {
        background-color: #f8f8f8;
        padding: 20px;
        border-radius: 6px;
        margin: 20px 0;
        font-size: 14px;
        color: #555555;
        white-space: pre-wrap;
      }
      .footer {
        border-top: 1px solid #e0e0e0;
        padding-top: 20px;
        text-align: center;
        font-size: 12px;
        color: #999999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">🏁 RaceDayAI</div>
        <p style="color: #ea580c; margin: 0; font-size: 14px;">New Contact Form Submission</p>
      </div>

      <div class="content">
        <div class="label">From</div>
        <div class="value">${data.name} &lt;${data.email}&gt;</div>

        <div class="label">Category</div>
        <div class="value">${subjectLabels[data.subject] || data.subject}</div>

        <div class="label">Message</div>
        <div class="message-box">${data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>

      <div class="footer">
        <p style="margin: 0;">Reply directly to this email to respond to ${data.name}.</p>
      </div>
    </div>
  </body>
</html>`;
}
