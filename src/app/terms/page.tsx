import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for RaceDayAI",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using RaceDayAI ("the Service"), you accept and
              agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              RaceDayAI provides AI-powered race execution planning tools for
              triathletes and endurance athletes. The Service generates
              personalized pacing strategies, nutrition plans, and race-day
              execution guidance based on user-provided fitness data, race
              information, and weather conditions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p>
              To use certain features of the Service, you must register for an
              account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and current information</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Subscription Plans</h2>
            <p className="mb-4">
              RaceDayAI offers free and paid subscription plans:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Free Plan:</strong> Includes 1 race plan with basic
                features
              </li>
              <li>
                <strong>Season Pass:</strong> $39/year or $4.99/month for 6
                race plans per season
              </li>
              <li>
                <strong>Unlimited:</strong> $99/year or $12.99/month for
                unlimited race plans
              </li>
            </ul>
            <p className="mt-4">
              Subscription fees are billed in advance and are non-refundable
              except as required by law. You may cancel your subscription at any
              time, effective at the end of your current billing period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Important Disclaimer</h2>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6">
              <p className="font-semibold mb-2">
                RaceDayAI provides guidance for informational purposes only.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Race plans are suggestions based on algorithms and should not
                  replace professional coaching or medical advice
                </li>
                <li>
                  You are responsible for your own training, health, and safety
                  decisions
                </li>
                <li>
                  Consult with qualified professionals before making changes to
                  your training or race strategy
                </li>
                <li>
                  We are not liable for any injuries, health issues, or race
                  outcomes resulting from following our recommendations
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. User Content</h2>
            <p>
              You retain ownership of any data you upload to the Service (GPX
              files, fitness metrics, etc.). By uploading content, you grant us
              a license to use, process, and store this data solely for
              providing the Service to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to access unauthorized areas of the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>
                Share your account credentials or sell access to the Service
              </li>
              <li>
                Use automated tools to access the Service without permission
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p>
              The Service, including its algorithms, design, code, and content,
              is owned by RaceDayAI and protected by copyright and other
              intellectual property laws. You may not copy, modify, or
              distribute any part of the Service without our written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RACEDAYAI SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR OTHER
              INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will
              notify users of material changes via email or through the Service.
              Your continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service
              at our discretion, without notice, for conduct that we believe
              violates these terms or is harmful to other users or the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with
              applicable laws, without regard to conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please
              contact us through our website or email support.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Last updated: February 11, 2026
          </p>
          <Link
            href="/"
            className="text-sm text-primary hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
