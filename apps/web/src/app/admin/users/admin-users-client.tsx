"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, RotateCcw, Shield } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  plansCreatedThisSeason: number;
  seasonStartDate: string | null;
  createdAt: string;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Starter",
  season: "Season Pass",
  unlimited: "Pro",
};

const PLAN_COLOR: Record<string, string> = {
  free: "text-muted-foreground",
  season: "text-blue-600",
  unlimited: "text-amber-600 font-semibold",
};

export function AdminUsersClient() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  async function searchUsers(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error("Failed to search users");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  }

  async function updatePlan(userId: string, plan: string) {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Failed to update plan");
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
      toast.success(`Plan updated to ${plan}`);
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setUpdating(null);
    }
  }

  async function resetCounter(userId: string) {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetCounter: true }),
      });
      if (!res.ok) throw new Error("Failed to reset counter");
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
      );
      toast.success("Plan counter reset");
    } catch {
      toast.error("Failed to reset counter");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin — Manage Users</h1>
      </div>

      <form onSubmit={searchUsers} className="flex gap-2 mb-8">
        <Input
          placeholder="Search by email or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <Button type="submit" disabled={loading || query.trim().length < 2}>
          <Search className="h-4 w-4 mr-1.5" />
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      {users.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">
          Search for a user by email or name to get started.
        </p>
      )}

      {users.length > 0 && (
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {user.name || "No name"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className={PLAN_COLOR[user.plan] || ""}>
                    {PLAN_LABEL[user.plan] || user.plan}
                  </span>
                  <span>{user.plansCreatedThisSeason} plans used</span>
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={user.plan}
                  onValueChange={(value) => updatePlan(user.id, value)}
                  disabled={updating === user.id}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Starter</SelectItem>
                    <SelectItem value="season">Season Pass</SelectItem>
                    <SelectItem value="unlimited">Pro</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetCounter(user.id)}
                  disabled={updating === user.id}
                  title="Reset plan counter to 0"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
