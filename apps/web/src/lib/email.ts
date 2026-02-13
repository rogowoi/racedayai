import { resend } from "./resend";
import { welcomeEmailHtml } from "@/emails/welcome";
import { passwordResetEmailHtml } from "@/emails/password-reset";
import { contactEmailHtml } from "@/emails/contact";

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

export async function sendContactEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  try {
    if (!resend) {
      console.warn("Resend not configured - skipping contact email");
      return;
    }
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "support@racedayai.com",
      reply_to: data.email,
      subject: `[Contact] ${data.subject}: from ${data.name}`,
      html: contactEmailHtml(data),
    });
  } catch (error) {
    console.error("Failed to send contact email:", error);
    throw error;
  }
}
