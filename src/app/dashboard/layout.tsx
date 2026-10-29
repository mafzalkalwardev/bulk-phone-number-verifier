import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.25rem 3rem" }}>
      <DashboardNav email={session.user.email} />
      {children}
    </div>
  );
}
