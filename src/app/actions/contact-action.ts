"use server";

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

  // TODO: Send email via Resend
  // const email = await resend.emails.send({
  //   from: "noreply@racedayai.com",
  //   to: "support@racedayai.com",
  //   subject: `New Contact Form Submission: ${data.subject}`,
  //   html: `...`,
  // });

  // For now, just return success after validation
  console.log("Contact form submitted:", data);

  return {
    success: true,
    message: "Thank you for your message. We'll get back to you soon!",
  };
}
