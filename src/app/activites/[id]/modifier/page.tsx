import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../../../compte/app-shell";
import { getActivityTags } from "../../activity-data";
import styles from "../../activities.module.css";
import { ActivityForm, type ActivityFormValues } from "../../creer/activity-form";

type Params = Promise<{ id: string }>;

export default function EditActivityPage({ params }: { params: Params }) {
  return <Suspense fallback={<main className={styles.loading}>Chargement du formulaire…</main>}><EditActivity params={params} /></Suspense>;
}

async function EditActivity({ params }: { params: Params }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: activity }, { data: categories }, tags] = await Promise.all([
    supabase.from("activities").select("*").eq("id", id).eq("author_id", user.id).is("deleted_at", null).maybeSingle(),
    supabase.from("categories").select("id,name").order("name"),
    getActivityTags(supabase, id),
  ]);
  if (!activity || !activity.category_id || activity.age_min == null || activity.age_max == null || activity.participants_min == null || activity.participants_max == null || activity.duration_minutes == null || !activity.environment) notFound();

  const values: ActivityFormValues = {
    id: activity.id,
    title: activity.title,
    description: activity.description ?? "",
    categoryId: activity.category_id,
    ageMin: activity.age_min,
    ageMax: activity.age_max,
    participantsMin: activity.participants_min,
    participantsMax: activity.participants_max,
    durationMinutes: activity.duration_minutes,
    environment: activity.environment,
    objectives: tags.objectives,
    equipment: tags.equipment,
    preparation: activity.preparation ?? "",
    safety: activity.safety ?? "",
    visibility: activity.visibility,
  };

  return (
    <AppShell>
      <header className={styles.formHeader}><p>Ma galerie</p><h1>Modifier l’activité</h1><span>Actualise les informations de ta fiche.</span></header>
      <ActivityForm categories={categories ?? []} activity={values} />
    </AppShell>
  );
}
