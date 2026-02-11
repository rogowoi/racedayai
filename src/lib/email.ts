import { resend } from "./resend";
import { welcomeEmailHtml } from "@/emails/welcome";
import { passwordResetEmailHtml } from "@/emails/password-reset";

const FROM_EMAIL = "RaceDayAI <hello@racedayai.com>";

export async function sendWelcomeEmail(
  name: string,
  email: string
): Promise<void> {
  try {
    if (!resend) {
      console.warn("Resend not configured - skipping welcome email");
      return;
    }
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to RaceDayAI!",
      html: welcomeEmailHtml(name),
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw - we don't want email failures to break the signup flow
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<void> {
  try {
    if (!resend) {
      console.warn("Resend not configured - skipping password reset email");
      return;
    }
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset Your RaceDayAI Password",
      html: passwordResetEmailHtml(resetUrl),
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Don't throw - we don't want email failures to break the password reset flow
  }
}
