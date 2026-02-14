import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-4 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>
              RaceDay<span className="text-primary">AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Set new password
          </h1>
          <p className="text-muted-foreground">
            Choose a strong password for your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
