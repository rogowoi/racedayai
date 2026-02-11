"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Watch, Unlink } from "lucide-react";

interface GarminConnectButtonProps {
  initialConnected?: boolean;
}

export function GarminConnectButton({
  initialConnected,
}: GarminConnectButtonProps) {
  const [connected, setConnected] = useState(initialConnected ?? false);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(initialConnected === undefined);

  useEffect(() => {
    if (initialConnected !== undefined) {
      setChecking(false);
      return;
    }
    fetch("/api/garmin/status")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setConfigured(data.configured);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [initialConnected]);

  const handleConnect = () => {
    setLoading(true);
    window.location.href = "/api/garmin/auth";
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/garmin/disconnect", { method: "POST" });
      if (res.ok) setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full h-14 justify-start gap-4 text-base font-normal"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Checking Garmin...
      </Button>
    );
  }

  if (!configured) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full h-14 justify-start gap-4 text-base font-normal opacity-50"
      >
        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Watch className="h-5 w-5 text-blue-600" />
        </div>
        Garmin Connect (Coming Soon)
      </Button>
    );
  }

  if (connected) {
    return (
      <div className="space-y-2 w-full">
        <Button
          variant="outline"
          disabled
          className="w-full h-14 justify-start gap-4 text-base font-normal border-green-200 bg-green-50 dark:bg-green-950/20"
        >
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          Garmin Connected
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={loading}
          className="text-xs text-muted-foreground"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Unlink className="h-3 w-3 mr-1" />
          )}
          Disconnect Garmin
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleConnect}
      disabled={loading}
      className="w-full h-14 justify-start gap-4 text-base font-normal"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Watch className="h-5 w-5 text-blue-600" />
        </div>
      )}
      Connect Garmin
    </Button>
  );
}
