"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, loginWithStrava } from "@/app/actions/auth-actions";
import { Zap, Loader2, AlertCircle, Activity, Check, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignUpForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan"); // "season" | "unlimited" | null

  const [state, formAction, isPending] = useActionState(signUp, {
    error: null,
  });

  const [password, setPassword] = useState("");

  const planLabel =
    plan === "season"
      ? "Season Pass"
      : plan === "unlimited"
        ? "Pro"
        : null;

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthChecks = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber];
  const strengthScore = strengthChecks.filter(Boolean).length;

  const getStrengthColor = () => {
    if (strengthScore === 0) return "";
    if (strengthScore <= 1) return "bg-red-500";
    if (strengthScore === 2) return "bg-orange-500";
    if (strengthScore === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strengthScore === 0) return "";
    if (strengthScore <= 1) return "Weak";
    if (strengthScore === 2) return "Fair";
    if (strengthScore === 3) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand header with back link */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold text-xl mb-4 hover:opacity-80 transition-opacity"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>
              RaceDay<span className="text-primary">AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Create Your Account
          </h1>
          <p className="text-muted-foreground">
            {planLabel
              ? `Sign up to get the ${planLabel} plan`
              : "Your first race plan is free \u2014 no credit card required"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign Up</CardTitle>
            <CardDescription>Choose your preferred sign-up method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strava first — it's the path of least resistance for triathletes */}
            <form action={loginWithStrava}>
              <Button
                variant="outline"
                type="submit"
                className="w-full h-14 justify-start gap-4 text-base font-normal"
              >
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                Continue with Strava
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with email
                </span>
              </div>
            </div>

            <form action={formAction} className="space-y-4">
              {state.error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Pass plan selection through to the server action */}
              {plan && <input type="hidden" name="plan" value={plan} />}

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  required
                  disabled={isPending}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={isPending}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  disabled={isPending}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password && (
                  <>
                    <div className="flex gap-1 mt-2">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < strengthScore ? getStrengthColor() : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    {strengthScore > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Password strength: <span className="font-medium">{getStrengthLabel()}</span>
                      </p>
                    )}
                    <div className="space-y-1 mt-2">
                      <div className={`flex items-center gap-1.5 text-xs ${hasMinLength ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs ${hasUpperCase ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {hasUpperCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs ${hasLowerCase ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {hasLowerCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        One lowercase letter
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs ${hasNumber ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        One number
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={isPending || (password.length > 0 && strengthScore < 4)}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : planLabel ? (
                  `Sign Up & Get ${planLabel}`
                ) : (
                  "Create Free Account"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
