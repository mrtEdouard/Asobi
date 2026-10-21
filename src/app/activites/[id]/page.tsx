import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../../compte/app-shell";
import { getActivityAuthors, getActivityTags } from "../activity-data";
import styles from "../activities.module.css";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ modification?: string }>;

const environmentNames = { indoor: "Intérieur", outdoor: "Extérieur", both: "Intérieur et extérieur" };

export default function ActivityDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return <Suspense fallback={<main className={styles.loading}>Chargement de la fiche…</main>}><ActivityDetail params={params} searchParams={searchParams} /></Suspense>;
}

async function ActivityDetail({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: activity } = await supabase.from("activities").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!activity) notFound();

  const [{ data: category }, tags, authorNames] = await Promise.all([
    activity.category_id
      ? supabase.from("categories").select("name").eq("id", activity.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getActivityTags(supabase, id),
    getActivityAuthors(supabase, [id]),
  ]);
  const isOwner = activity.author_id === user.id;

  return (
    <AppShell>
      <div className={styles.detailNav}><Link href={`/activites?vue=${activity.visibility === "public" ? "communaute" : "mes"}`}>← {activity.visibility === "public" ? "Communauté" : "Galerie"}</Link>{isOwner && <Link href={`/activites/${id}/modifier`} className={styles.editButton}>Modifier</Link>}</div>
      {query.modification === "ok" && <p className={styles.success}>Les modifications ont été enregistrées.</p>}
      <article className={styles.detail}>
        <div className={styles.cardTopline}><span>{category?.name ?? "Sans catégorie"}</span><b>{activity.visibility === "public" ? "Publique" : "Privée"}</b></div>
        <h1>{activity.title}</h1>
        <p className={styles.detailAuthor}>Une activité proposée par <strong>@{authorNames.get(activity.author_id) ?? "membre"}</strong></p>
        <p className={styles.detailDescription}>{activity.description}</p>
        <div className={styles.detailMeta}>
          <div><small>Âge</small><strong>{activity.age_min}–{activity.age_max} ans</strong></div>
          <div><small>Participants</small><strong>{activity.participants_min}–{activity.participants_max}</strong></div>
          <div><small>Durée</small><strong>{activity.duration_minutes} min</strong></div>
          <div><small>Lieu</small><strong>{activity.environment ? environmentNames[activity.environment] : "Non précisé"}</strong></div>
        </div>
        <DetailSection title="Objectifs pédagogiques" tags={tags.objectives} />
        <DetailSection title="Matériel" tags={tags.equipment} />
        <DetailSection title="Préparation et déroulement" text={activity.preparation} />
        <DetailSection title="Sécurité et points de vigilance" text={activity.safety} />
      </article>
    </AppShell>
  );
}

function DetailSection({ title, text, tags }: { title: string; text?: string | null; tags?: string[] }) {
  return (
    <section className={styles.detailSection}>
      <h2>{title}</h2>
      {tags ? <div className={styles.detailTags}>{tags.length ? tags.map((tag) => <span key={tag}>{tag}</span>) : <p>Non renseigné</p>}</div> : <p>{text || "Non renseigné"}</p>}
    </section>
  );
}
