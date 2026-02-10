"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Check } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/stripe";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your racing season
          </p>
        </div>

        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setBilling("annual")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              billing === "annual"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Annual (Save 33%)
          </button>
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              billing === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Monthly
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* Free Tier */}
          <Card>
            <CardHeader>
              <CardTitle>{PLANS.free.name}</CardTitle>
              <CardDescription>Try RaceDayAI</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </Link>
              <div className="space-y-3 pt-2">
                {PLANS.free.features.map((feature) => (
                  <div key={feature} className="flex gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Season Pass */}
          <Card className="border-primary shadow-lg">
            <CardHeader>
              <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                Most Popular
              </div>
              <CardTitle>{PLANS.season.name}</CardTitle>
              <CardDescription>Perfect for most athletes</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">
                  ${billing === "annual" ? PLANS.season.annualPrice : PLANS.season.monthlyPrice}
                </span>
                <span className="text-muted-foreground">
                  /{billing === "annual" ? "year" : "month"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/signup">
                <Button className="w-full">
                  Get Started
                </Button>
              </Link>
              <div className="space-y-3 pt-2">
                {PLANS.season.features.map((feature) => (
                  <div key={feature} className="flex gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Unlimited */}
          <Card>
            <CardHeader>
              <CardTitle>{PLANS.unlimited.name}</CardTitle>
              <CardDescription>For coaches & pros</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold">
                  ${billing === "annual" ? PLANS.unlimited.annualPrice : PLANS.unlimited.monthlyPrice}
                </span>
                <span className="text-muted-foreground">
                  /{billing === "annual" ? "year" : "month"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </Link>
              <div className="space-y-3 pt-2">
                {PLANS.unlimited.features.map((feature) => (
                  <div key={feature} className="flex gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>All plans include our core pacing and nutrition calculations.</p>
          <p className="mt-2">Questions? Email us at support@racedayai.com</p>
        </div>
      </div>
    </div>
  );
}
