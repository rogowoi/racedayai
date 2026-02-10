import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/app/actions/auth-actions";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create Your Account
          </h1>
          <p className="text-muted-foreground">
            Sign up to start creating personalized race plans
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign Up</CardTitle>
            <CardDescription>
              Enter your details to create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  required
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
                />
              </div>

              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
