import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../../compte/app-shell";
import { ActivityForm } from "./activity-form";
import styles from "../activities.module.css";

export default function CreateActivityPage() {
  return <Suspense fallback={<main className={styles.loading}>Chargement du formulaire…</main>}><CreateActivityContent /></Suspense>;
}

async function CreateActivityContent() {
  await requireUser();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id,name").order("name");

  return (
    <AppShell>
      <header className={styles.formHeader}><p>Nouvelle fiche</p><h1>Créer une activité</h1><span>Renseigne les informations utiles pour pouvoir l’animer facilement.</span></header>
      <ActivityForm categories={categories ?? []} />
    </AppShell>
  );
}
