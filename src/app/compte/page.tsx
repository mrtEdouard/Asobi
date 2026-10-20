import { Suspense } from "react";
import { logoutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default function AccountPage() {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center bg-[#f7f3ea] text-[#0b2b42]">Chargement du compte…</main>}><Account /></Suspense>;
}

async function Account() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, birth_date, created_at")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#0b2b42] p-6 sm:p-12">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(11,43,66,.1)] sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#0aa7a5]">Espace personnel</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">Bonjour {profile?.username ?? "membre"}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Ton authentification fonctionne. Cette page est rendue sur le serveur et reste inaccessible sans session valide.</p>
        <dl className="mt-10 grid gap-4 rounded-2xl bg-[#eef4f4] p-6 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">E-mail privé</dt><dd className="mt-1 font-semibold">{user.email}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Pseudo</dt><dd className="mt-1 font-semibold">{profile?.username ?? "Profil indisponible"}</dd></div>
        </dl>
        <form action={logoutAction} className="mt-8"><button className="rounded-full bg-[#ff684f] px-6 py-3 font-bold text-white hover:bg-[#e95741]">Se déconnecter</button></form>
      </section>
    </main>
  );
}
