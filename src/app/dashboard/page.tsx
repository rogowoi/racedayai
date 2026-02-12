import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, TrendingUp, Settings } from "lucide-react";
import { PLANS, getPlanLimits } from "@/lib/stripe";

export const metadata = {
  title: "Dashboard",
};

async function getDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athletes: {
        include: {
          racePlans: {
            include: { course: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });

  return user;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getDashboardData(session.user.id);
  const athlete = user?.athletes;
  const racePlans = athlete?.racePlans || [];

  const planConfig = getPlanLimits(user?.plan || "free");
  const plansRemaining =
    planConfig.maxPlansPerSeason === Infinity
      ? "Unlimited"
      : Math.max(
          0,
          planConfig.maxPlansPerSeason - (user?.plansCreatedThisSeason || 0)
        );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.name || "Athlete"}
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/wizard">
                <Plus className="mr-2 h-4 w-4" />
                Create Race Plan
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Plan
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{planConfig.name}</div>
                <p className="text-xs text-muted-foreground">
                  {plansRemaining === "Unlimited"
                    ? "Unlimited plans available"
                    : `${plansRemaining} plans remaining this season`}
                </p>
                {user?.plan === "free" && (
                  <Button variant="link" className="px-0 mt-2" asChild>
                    <Link href="/pricing">Upgrade →</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Plans
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{racePlans.length}</div>
                <p className="text-xs text-muted-foreground">
                  {user?.plansCreatedThisSeason || 0} this season
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button variant="link" className="px-0 justify-start" asChild>
                    <Link href="/dashboard/settings">Settings</Link>
                  </Button>
                  <Button variant="link" className="px-0 justify-start" asChild>
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Plans */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Recent Race Plans
            </h2>

            {racePlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No race plans yet
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first race plan to get started
                  </p>
                  <Button asChild>
                    <Link href="/wizard">Create Your First Plan</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {racePlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {plan.course.raceName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {plan.raceDate.toLocaleDateString()} ·{" "}
                        {plan.course.distanceCategory.toUpperCase()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {plan.predictedFinishSec && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Predicted Time:
                            </span>
                            <span className="font-medium">
                              {formatTime(plan.predictedFinishSec)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Created:
                          </span>
                          <span>{plan.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href={`/plan/${plan.id}`}>View Plan</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
