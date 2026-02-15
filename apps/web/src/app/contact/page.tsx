import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Mail, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export default function ContactPage() {

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-16 pb-8 md:pt-20 md:pb-12">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions or feedback? We&apos;d love to hear from you. Our
              support team is here to help.
            </p>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              {/* Email Card */}
              <div className="flex flex-col items-center p-6 bg-card rounded-xl border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                <a
                  href="mailto:support@racedayai.com"
                  className="text-sm text-primary hover:underline"
                >
                  support@racedayai.com
                </a>
              </div>

              {/* Response Time Card */}
              <div className="flex flex-col items-center p-6 bg-card rounded-xl border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Response Time</h3>
                <p className="text-sm text-muted-foreground">
                  Within 24 hours
                </p>
              </div>

              {/* FAQ Card */}
              <div className="flex flex-col items-center p-6 bg-card rounded-xl border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Quick Answers</h3>
                <Link
                  href="/faq"
                  className="text-sm text-primary hover:underline"
                >
                  View FAQ
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-2xl">
            <ContactForm />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 text-center max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Create your first race plan for free and see how RaceDayAI can
              help you race smarter.
            </p>
            <Button size="lg" className="h-13 text-base px-10 font-semibold shadow-lg shadow-primary/25" asChild>
              <Link href="/wizard">
                Build My Race Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
