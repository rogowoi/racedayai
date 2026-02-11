import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Mock Navbar */}
      <div className="h-16 border-b bg-background" />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-muted rounded-md animate-pulse" />
              <div className="h-4 w-40 bg-muted rounded-md animate-pulse" />
            </div>
            <div className="h-10 w-40 bg-muted rounded-md animate-pulse" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
                  <div className="h-4 w-4 bg-muted rounded-md animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-8 w-20 bg-muted rounded-md animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded-md animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Plans Section */}
          <div>
            <div className="h-8 w-48 bg-muted rounded-md animate-pulse mb-4" />

            {/* Plan Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 w-32 bg-muted rounded-md animate-pulse mb-2" />
                    <div className="h-3 w-40 bg-muted rounded-md animate-pulse" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted rounded-md animate-pulse" />
                      <div className="h-3 w-3/4 bg-muted rounded-md animate-pulse" />
                    </div>
                    <div className="h-9 w-full bg-muted rounded-md animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
