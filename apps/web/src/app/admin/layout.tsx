import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    redirect("/");
  }

  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
