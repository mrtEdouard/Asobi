import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#fcfaf5]" />}>
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect() {
  const user = await getCurrentUser();
  return redirect(user ? "/compte" : "/connexion");
}
