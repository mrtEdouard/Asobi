import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../../compte/app-shell";
import { saveActivityAction, unsaveActivityAction } from "../actions";
import { getActivityAuthors, getActivityGalleryCounts, getActivityTags } from "../activity-data";
import { getActivityImages } from "../activity-images";
import { DeleteActivityButton } from "../delete-activity-button";
import { GalleryCount } from "../gallery-count";
import { NoticeToast } from "../notice-toast";
import { SubmitButton } from "../submit-button";
import { PhotoGallery } from "../photo-gallery";
import styles from "../activities.module.css";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ notice?: string; n?: string }>;

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
  // Toutes les lectures ne dependent que de l'identifiant : elles partent en parallele.
  // La RLS filtre chacune d'elles, une fiche non visible renvoie donc des resultats vides.
  const [{ data: activity }, { data: categories }, tags, authorNames, galleryCounts, images, { data: save }] = await Promise.all([
    supabase.from("activities").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("categories").select("id,name"),
    getActivityTags(supabase, id),
    getActivityAuthors(supabase, [id]),
    getActivityGalleryCounts(supabase, [id]),
    getActivityImages(supabase, [id]),
    supabase.from("activity_saves").select("activity_id").eq("user_id", user.id).eq("activity_id", id).maybeSingle(),
  ]);
  if (!activity) notFound();
  const category = (categories ?? []).find((item) => item.id === activity.category_id);
  const isOwner = activity.author_id === user.id;
  const galleryCount = galleryCounts.get(id) ?? 0;
  const isSaved = Boolean(save);
  const backToGallery = activity.visibility !== "public" || isSaved;
  const activityImages = images.get(id);
  // Sans couverture, une illustration par defaut ; les liens signes Supabase ne passent pas par l'optimiseur.
  const coverUrl = activityImages?.cover?.url;
  const fallbackImage = activity.id.charCodeAt(0) % 2 === 0 ? "/images/cards/activite-fresque.webp" : "/images/cards/activite-explorateurs.webp";
  const photos = activityImages?.photos ?? [];

  return (
    <AppShell>
      <div className={styles.detailNav}><Link href={`/activites?vue=${backToGallery ? "mes" : "communaute"}`}>← {backToGallery ? "Galerie" : "Communauté"}</Link>{isOwner && <Link href={`/activites/${id}/modifier`} className={styles.editButton}>Modifier</Link>}</div>
      <NoticeToast key={query.n} code={query.notice} />
      <article className={styles.detail}>
        <div className={styles.detailHero}>
          <Image src={coverUrl ?? fallbackImage} alt={`Illustration de l’activité ${activity.title}`} fill priority sizes="430px" unoptimized={Boolean(coverUrl)} />
          <div className={styles.heroShade} />
          <div className={styles.heroTitle}>
            <h1>{activity.title}</h1>
            <p className={styles.heroContext}>Activité {category?.name ?? "sans catégorie"} <span>•</span> {activity.visibility === "public" ? "Publique" : "Privée"}</p>
            <p>Proposée par <strong>@{authorNames.get(activity.author_id) ?? "membre"}</strong></p>
          </div>
        </div>
        <GalleryCount count={galleryCount} />
        {!isOwner && activity.visibility === "public" && (
          <form action={isSaved ? unsaveActivityAction : saveActivityAction} className={styles.saveForm}>
            <input type="hidden" name="activityId" value={activity.id} />
            <input type="hidden" name="returnTo" value="fiche" />
            <SubmitButton className={isSaved ? styles.savedButton : undefined} pendingLabel={isSaved ? "Retrait…" : "Ajout…"}>{isSaved ? "♥ Dans ma galerie · Retirer" : "Ajouter à ma galerie"}</SubmitButton>
          </form>
        )}
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
        {photos.length > 0 && (
          <section className={styles.photoSection} aria-labelledby="activity-photos">
            <h2 id="activity-photos">En images</h2>
            <PhotoGallery photos={photos} title={activity.title} />
          </section>
        )}
        {photos.length === 0 && isOwner && <p className={styles.photoHint}><Link href={`/activites/${id}/modifier`}>Ajouter des photos</Link> pour illustrer ta fiche.</p>}
        {isOwner && <DeleteActivityButton activityId={activity.id} />}
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
