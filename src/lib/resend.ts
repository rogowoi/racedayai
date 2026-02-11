// @ts-expect-error - resend types installed with package
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;
