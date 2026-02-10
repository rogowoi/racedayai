import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithStrava, loginWithCredentials } from "@/app/actions/auth-actions";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
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
            Welcome to RaceDayAI
          </h1>
          <p className="text-muted-foreground">
            Sign in to create your personalized race plan
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign In</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={loginWithCredentials} className="space-y-4">
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
                  placeholder="Your password"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

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

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
