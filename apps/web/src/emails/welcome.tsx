export function welcomeEmailHtml(name: string): string {
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
      .features {
        background-color: #f8f8f8;
        padding: 20px;
        border-radius: 6px;
        margin: 20px 0;
      }
      .feature-item {
        margin-bottom: 12px;
        font-size: 14px;
        color: #555555;
      }
      .feature-icon {
        color: #ea580c;
        font-weight: bold;
        margin-right: 8px;
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
        <p style="color: #ea580c; margin: 0; font-size: 14px;">AI-Powered Race Planning</p>
      </div>

      <div class="content">
        <div class="greeting">Welcome to RaceDayAI, ${name}!</div>

        <p class="text">
          Thank you for joining RaceDayAI! We're thrilled to have you as part of our community of triathlon enthusiasts.
        </p>

        <p class="text">
          You're now ready to create your first race plan for free. Our AI race planning engine will help you train smarter and race stronger by providing personalized training strategies based on your fitness level, goals, and the specific race course.
        </p>

        <div class="features">
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            Personalized race strategies tailored to your fitness
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            Split predictions for swim, bike, and run
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            Nutrition and hydration recommendations
          </div>
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            Coach-style narrative guidance for race day
          </div>
        </div>

        <p style="text-align: center;">
          <a href="https://racedayai.vercel.app/wizard" class="cta-button">Create Your First Race Plan</a>
        </p>

        <p class="text">
          If you have any questions or need assistance, our support team is here to help!
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
