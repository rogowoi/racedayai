"use server";

import { sendContactEmail } from "@/lib/email";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
}

export async function submitContact(
  data: ContactFormData
): Promise<ContactResponse> {
  // Validate form data
  if (!data.name || !data.name.trim()) {
    return { success: false, message: "Name is required" };
  }

  if (!data.email || !data.email.trim()) {
    return { success: false, message: "Email is required" };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { success: false, message: "Please enter a valid email address" };
  }

  if (!data.message || !data.message.trim()) {
    return { success: false, message: "Message is required" };
  }

  if (data.message.trim().length < 10) {
    return {
      success: false,
      message: "Message must be at least 10 characters long",
    };
  }

  // Validate subject
  const validSubjects = ["general", "billing", "bug", "feature"];
  if (!validSubjects.includes(data.subject)) {
    return { success: false, message: "Invalid subject selected" };
  }

  try {
    await sendContactEmail(data);
  } catch {
    return { success: false, message: "Failed to send message. Please try again." };
  }

  return {
    success: true,
    message: "Thank you for your message. We'll get back to you soon!",
  };
}
