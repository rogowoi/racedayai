import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for RaceDayAI",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              RaceDayAI ("we," "our," or "us") is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.1 Information You Provide
            </h3>
            <p className="mb-4">When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and email address</li>
              <li>Password (encrypted)</li>
              <li>
                Fitness metrics (FTP, threshold pace, resting heart rate, etc.)
              </li>
              <li>Race information (race name, date, location, goals)</li>
              <li>GPX files for course analysis (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.2 Third-Party Integrations
            </h3>
            <p className="mb-4">
              If you connect third-party services to your account:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Strava:</strong> We access your activity data, fitness
                metrics, and profile information as authorized by you
              </li>
              <li>
                <strong>Garmin Connect:</strong> We access your activity
                summaries, daily health metrics (heart rate, weight), and body
                composition data via the Garmin Health API as authorized by you.
                We do not access GPS tracks, location data, or any data beyond
                what is needed to calculate your fitness profile.
              </li>
              <li>
                Connection tokens are stored securely and can be revoked at any
                time through your account settings or directly through the
                third-party service
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.3 Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Device information (browser type, operating system, IP address)
              </li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Generate personalized race execution plans</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Improve our algorithms and features</li>
              <li>Respond to support requests</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>
                Send marketing communications (with your consent, which you can
                withdraw at any time)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="mb-4">
              We do not sell your personal information. We may share your
              information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service Providers:</strong> Payment processors (Stripe),
                hosting providers (Vercel), database services (Neon), analytics
                providers
              </li>
              <li>
                <strong>API Providers:</strong> Weather services (for race-day
                forecasts), mapping services (for GPX analysis)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights
              </li>
              <li>
                <strong>Public Sharing:</strong> If you choose to share a race
                plan via public link, that plan becomes publicly accessible
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your
              data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encrypted password storage (bcrypt)</li>
              <li>Secure database hosting with access controls</li>
              <li>Regular security audits</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the Internet is 100%
              secure. While we strive to protect your data, we cannot guarantee
              absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update inaccurate or incomplete
                information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and
                data
              </li>
              <li>
                <strong>Portability:</strong> Export your data in a
                machine-readable format
              </li>
              <li>
                <strong>Objection:</strong> Object to certain data processing
                activities
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw previously given
                consent at any time
              </li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us through your account
              settings or via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide services. When you delete your
              account, we delete your personal information within 30 days,
              except where retention is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="mb-4">We use cookies and similar technologies for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authentication and session management</li>
              <li>Analytics (Google Analytics, Vercel Analytics)</li>
              <li>Performance monitoring (Vercel Speed Insights)</li>
              <li>Preferences and settings</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings. Disabling
              cookies may affect functionality of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p>
              The Service is not intended for users under 13 years of age. We do
              not knowingly collect information from children under 13. If we
              learn we have collected such information, we will delete it
              promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your own. We ensure appropriate safeguards are in place
              to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes via email or through a prominent
              notice on the Service. Your continued use after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data
              practices, please contact us through our website or email support.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. California Privacy Rights</h2>
            <p className="mb-4">
              California residents have additional rights under the CCPA:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of sale of personal information</li>
              <li>Right to deletion of personal information</li>
              <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>
            <p className="mt-4">
              Note: We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. GDPR Rights (EU/EEA Users)</h2>
            <p className="mb-4">
              If you are located in the European Union or European Economic Area,
              you have additional rights under GDPR, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>
                Right to lodge a complaint with a supervisory authority
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Last updated: February 11, 2026
          </p>
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
