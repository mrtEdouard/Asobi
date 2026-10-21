import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../../compte/app-shell";
import { getActivityAuthors, getActivityGalleryCounts, getActivityTags } from "../activity-data";
import { DeleteActivityButton } from "../delete-activity-button";
import styles from "../activities.module.css";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ modification?: string; suppression?: string }>;

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

  const rootActivityId = activity.source_activity_id ?? activity.id;
  const [{ data: category }, tags, authorNames, galleryCounts] = await Promise.all([
    activity.category_id
      ? supabase.from("categories").select("name").eq("id", activity.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getActivityTags(supabase, id),
    getActivityAuthors(supabase, [id]),
    getActivityGalleryCounts(supabase, [rootActivityId]),
  ]);
  const isOwner = activity.author_id === user.id;
  const galleryCount = galleryCounts.get(rootActivityId) ?? 0;
  const mainImage = activity.id.charCodeAt(0) % 2 === 0 ? "/images/cards/activite-fresque.webp" : "/images/cards/activite-explorateurs.webp";
  const secondaryImage = mainImage === "/images/cards/activite-fresque.webp" ? "/images/cards/activite-explorateurs.webp" : "/images/cards/activite-fresque.webp";

  return (
    <AppShell>
      <div className={styles.detailNav}><Link href={`/activites?vue=${activity.visibility === "public" ? "communaute" : "mes"}`}>← {activity.visibility === "public" ? "Communauté" : "Galerie"}</Link>{isOwner && <Link href={`/activites/${id}/modifier`} className={styles.editButton}>Modifier</Link>}</div>
      {query.modification === "ok" && <p className={styles.success}>Les modifications ont été enregistrées.</p>}
      {query.suppression === "erreur" && <p className={styles.errorNotice}>L’activité n’a pas pu être supprimée.</p>}
      <article className={styles.detail}>
        <div className={styles.detailHero}>
          <Image src={mainImage} alt={`Illustration de l’activité ${activity.title}`} fill priority sizes="430px" />
          <div className={styles.heroShade} />
          <div className={styles.heroTitle}>
            <h1>{activity.title}</h1>
            <p className={styles.heroContext}>Activité {category?.name ?? "sans catégorie"} <span>•</span> {activity.visibility === "public" ? "Publique" : "Privée"}</p>
            <p>Proposée par <strong>@{authorNames.get(activity.author_id) ?? "membre"}</strong></p>
          </div>
        </div>
        <div className={styles.galleryCount}><span aria-hidden="true">♡</span><div><strong>{galleryCount}</strong><small>{galleryCount > 1 ? "personnes ont" : "personne a"} ajouté cette activité à leur galerie</small></div></div>
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
        <section className={styles.photoSection} aria-labelledby="activity-photos"><h2 id="activity-photos">En images</h2><div className={styles.photoGrid}><div><Image src={secondaryImage} alt="Ambiance de l’activité" fill sizes="210px" /></div><div><Image src={mainImage} alt="Mise en situation de l’activité" fill sizes="210px" /></div></div></section>
        {isOwner && <DeleteActivityButton activityId={activity.id} isCopy={Boolean(activity.source_activity_id)} />}
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
