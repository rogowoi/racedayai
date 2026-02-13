export default function WizardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">
          Preparing your race plan wizard...
        </p>
      </div>
    </div>
  );
}
