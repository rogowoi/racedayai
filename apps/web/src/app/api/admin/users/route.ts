import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const all = searchParams.get("all") === "1";

  if (!all && (!q || q.length < 2)) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      plansCreatedThisSeason: true,
      seasonStartDate: true,
      createdAt: true,
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
