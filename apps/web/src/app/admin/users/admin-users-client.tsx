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
import { Search, RotateCcw, Shield, Users } from "lucide-react";

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
  const [showingAll, setShowingAll] = useState(false);

  async function searchUsers(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;

    setLoading(true);
    setShowingAll(false);
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

  async function loadAllUsers() {
    setLoading(true);
    setShowingAll(true);
    setQuery("");
    try {
      const res = await fetch("/api/admin/users?all=1");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error("Failed to load users");
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
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin — Manage Users</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-8">
        <form onSubmit={searchUsers} className="flex gap-2 flex-1">
          <Input
            placeholder="Search by email or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" disabled={loading || query.trim().length < 2}>
            <Search className="h-4 w-4 mr-1.5" />
            {loading && !showingAll ? "Searching..." : "Search"}
          </Button>
        </form>
        <Button
          variant="outline"
          onClick={loadAllUsers}
          disabled={loading}
        >
          <Users className="h-4 w-4 mr-1.5" />
          {loading && showingAll ? "Loading..." : "Show All"}
        </Button>
      </div>

      {users.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">
          Search for a user or click &quot;Show All&quot; to see everyone.
        </p>
      )}

      {users.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {users.length} user{users.length !== 1 ? "s" : ""}
            {showingAll ? " total" : " found"}
          </p>

          {/* Table view */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium px-4 py-3">Name</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Plan</th>
                  <th className="text-center font-medium px-4 py-3">Used</th>
                  <th className="text-left font-medium px-4 py-3">Joined</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-[160px]">
                      {user.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[220px]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={PLAN_COLOR[user.plan] || ""}>
                        {PLAN_LABEL[user.plan] || user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.plansCreatedThisSeason}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={user.plan}
                          onValueChange={(value) => updatePlan(user.id, value)}
                          disabled={updating === user.id}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
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
                          className="h-8 text-xs"
                          onClick={() => resetCounter(user.id)}
                          disabled={updating === user.id}
                          title="Reset plan counter to 0"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
