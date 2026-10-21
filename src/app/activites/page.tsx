import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../compte/app-shell";
import { saveActivityAction, unsaveActivityAction } from "./actions";
import { getActivityAuthors, getActivityGalleryCounts } from "./activity-data";
import { DeleteActivityButton } from "./delete-activity-button";
import { NoticeToast } from "./notice-toast";
import styles from "./activities.module.css";

type SearchParams = Promise<{
  vue?: string;
  notice?: string;
  n?: string;
  q?: string;
  categorie?: string;
  environnement?: string;
  tri?: string;
}>;

const environmentPhrases = { indoor: "en intérieur", outdoor: "en extérieur", both: "en intérieur ou en extérieur" };

/** Presentation rapide : « Pour les 10–12 ans, de 12 à 20 participants, environ 60 min en extérieur. » */
function activitySummary(activity: {
  age_min: number | null;
  age_max: number | null;
  participants_min: number | null;
  participants_max: number | null;
  duration_minutes: number | null;
  environment: keyof typeof environmentPhrases | null;
}) {
  const parts = [
    activity.age_min != null && activity.age_max != null && `pour les ${activity.age_min}–${activity.age_max} ans`,
    activity.participants_min != null && activity.participants_max != null && `de ${activity.participants_min} à ${activity.participants_max} participants`,
    activity.duration_minutes && `environ ${activity.duration_minutes} min${activity.environment ? ` ${environmentPhrases[activity.environment]}` : ""}`,
  ].filter(Boolean);
  if (!parts.length) return null;
  const sentence = parts.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr");
}

export default function ActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<main className={styles.loading}>Chargement des activités…</main>}><ActivitiesContent searchParams={searchParams} /></Suspense>;
}

async function ActivitiesContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const community = params.vue === "communaute";
  const supabase = await createClient();

  let activitiesQuery = supabase.from("activities").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  activitiesQuery = community
    ? activitiesQuery.eq("visibility", "public")
    : activitiesQuery.eq("author_id", user.id);

  const [{ data: listedActivities }, { data: saves }, { data: categories }] = await Promise.all([
    activitiesQuery,
    supabase.from("activity_saves").select("activity_id"),
    supabase.from("categories").select("id,name").order("name"),
  ]);
  const savedIds = new Set((saves ?? []).map((save) => save.activity_id));
  let activities = listedActivities ?? [];
  // Ma galerie : mes fiches + les fiches publiques que j'ai enregistrees (celles de leurs auteurs).
  if (!community && savedIds.size) {
    const { data: savedActivities } = await supabase
      .from("activities")
      .select("*")
      .in("id", [...savedIds])
      .eq("visibility", "public")
      .is("deleted_at", null);
    activities = [...activities, ...(savedActivities ?? [])];
  }
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const activityIds = activities.map((activity) => activity.id);
  const [authorNames, galleryCounts] = await Promise.all([
    getActivityAuthors(supabase, activityIds),
    getActivityGalleryCounts(supabase, activityIds),
  ]);
  const search = (params.q ?? "").trim().slice(0, 80);
  const categoryFilter = params.categorie ?? "";
  const environmentFilter = params.environnement ?? "";
  const sort = params.tri ?? "recent";
  const filteredActivities = [...activities]
    .filter((activity) => !search || normalized(`${activity.title} ${activity.description ?? ""}`).includes(normalized(search)))
    .filter((activity) => !categoryFilter || activity.category_id === categoryFilter)
    .filter((activity) => !environmentFilter || activity.environment === environmentFilter)
    .sort((left, right) => {
      if (sort === "ancien") return left.created_at.localeCompare(right.created_at);
      if (sort === "titre") return left.title.localeCompare(right.title, "fr");
      if (sort === "duree") return (left.duration_minutes ?? 0) - (right.duration_minutes ?? 0);
      return right.created_at.localeCompare(left.created_at);
    });

  return (
    <AppShell>
      <header className={styles.pageHeader}>
        <div><p>Ta banque d’idées</p><h1>Activités</h1></div>
        <Link href="/activites/creer" className={styles.addButton}>Créer</Link>
      </header>

      <nav className={styles.tabs} aria-label="Vues des activités">
        <Link href="/activites?vue=mes" className={!community ? styles.activeTab : ""} aria-current={!community ? "page" : undefined}>Mes activités</Link>
        <Link href="/activites?vue=communaute" className={community ? styles.activeTab : ""} aria-current={community ? "page" : undefined}>Communauté</Link>
      </nav>

      <NoticeToast key={params.n} code={params.notice} />

      <form className={styles.filters} method="get">
        <input type="hidden" name="vue" value={community ? "communaute" : "mes"} />
        <label className={styles.searchField}><span className={styles.srOnly}>Rechercher</span><input name="q" defaultValue={search} placeholder="Rechercher une activité…" maxLength={80} /><button type="submit" aria-label="Lancer la recherche">⌕</button></label>
        <div className={styles.filterGrid}>
          <label><span>Catégorie</span><select name="categorie" defaultValue={categoryFilter}><option value="">Toutes</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span>Lieu</span><select name="environnement" defaultValue={environmentFilter}><option value="">Tous</option><option value="indoor">Intérieur</option><option value="outdoor">Extérieur</option><option value="both">Les deux</option></select></label>
          <label><span>Trier par</span><select name="tri" defaultValue={sort}><option value="recent">Plus récentes</option><option value="ancien">Plus anciennes</option><option value="titre">Titre A–Z</option><option value="duree">Durée</option></select></label>
          <button type="submit">Appliquer</button>
        </div>
        {(search || categoryFilter || environmentFilter || sort !== "recent") && <Link href={`/activites?vue=${community ? "communaute" : "mes"}`} className={styles.resetFilters}>Réinitialiser les filtres</Link>}
      </form>

      <div className={styles.resultCount}>{filteredActivities.length} activité{filteredActivities.length > 1 ? "s" : ""}</div>

      <section className={styles.list} aria-live="polite">
        {!filteredActivities.length ? (
          <div className={styles.empty}>
            <h2>{activities.length ? "Aucun résultat" : community ? "Aucune activité partagée" : "Ta galerie est vide"}</h2>
            <p>{activities.length ? "Essaie de modifier ta recherche ou tes filtres." : community ? "Les activités publiques apparaîtront ici." : "Crée ta première fiche ou ajoute des activités de la communauté."}</p>
            {!activities.length && !community && <Link href="/activites/creer">Créer une activité</Link>}
          </div>
        ) : filteredActivities.map((activity) => {
          const isOwner = activity.author_id === user.id;
          const isSaved = savedIds.has(activity.id);
          const saveCount = galleryCounts.get(activity.id) ?? 0;
          return (
          <article className={styles.activityCard} key={activity.id}>
            <div className={styles.cardTopline}>
              <span>{categoryNames.get(activity.category_id ?? "") ?? "Sans catégorie"}</span>
              <div className={styles.cardStatus}>
                {activity.visibility === "public" && (
                  <span className={styles.cardHearts} aria-label={`Ajoutée ${saveCount} fois en galerie`}>
                    <span aria-hidden="true">{isSaved ? "♥" : "♡"}</span>{saveCount}
                  </span>
                )}
                <b>{activity.visibility === "public" ? "Publique" : "Privée"}</b>
              </div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardMain}>
                <h2><Link href={`/activites/${activity.id}`} className={styles.cardLink}>{activity.title}</Link></h2>
                <p className={styles.author}>Par @{authorNames.get(activity.author_id) ?? "membre"}</p>
                {activity.description && <p className={styles.cardDescription}>{activity.description}</p>}
                {activitySummary(activity) && <p className={styles.cardSummary}>{activitySummary(activity)}</p>}
              </div>
              {isOwner && (
                <div className={styles.cardActions}>
                  <Link href={`/activites/${activity.id}/modifier`}>Modifier</Link>
                  <DeleteActivityButton activityId={activity.id} compact />
                </div>
              )}
              {!isOwner && isSaved && !community && (
                <form action={unsaveActivityAction} className={styles.cardActions}>
                  <input type="hidden" name="activityId" value={activity.id} />
                  <input type="hidden" name="returnTo" value="mes" />
                  <button type="submit" className={styles.unsaveCompact}>Retirer</button>
                </form>
              )}
            </div>
            {!isOwner && community && (
              <form action={isSaved ? unsaveActivityAction : saveActivityAction} className={styles.copyForm}>
                <input type="hidden" name="activityId" value={activity.id} />
                <input type="hidden" name="returnTo" value="communaute" />
                <button type="submit" className={isSaved ? styles.savedButton : undefined}>{isSaved ? "♥ Dans ma galerie · Retirer" : "Ajouter à ma galerie"}</button>
              </form>
            )}
          </article>
          );
        })}
      </section>
    </AppShell>
  );
}
