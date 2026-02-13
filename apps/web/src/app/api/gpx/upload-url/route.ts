import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGpxUploadUrl } from "@/lib/r2";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = `${userId}-${Date.now()}.gpx`;
  const uploadUrl = await getGpxUploadUrl(key);

  return NextResponse.json({ key, uploadUrl });
}
