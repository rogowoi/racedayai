export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          RaceDayAI
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          Stop guessing on race day. Get a personalized race-day execution plan
          with pacing, nutrition, hydration, and real-time weather adjustments.
        </p>
      </main>
    </div>
  );
}
