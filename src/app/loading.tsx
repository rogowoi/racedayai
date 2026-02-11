export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
