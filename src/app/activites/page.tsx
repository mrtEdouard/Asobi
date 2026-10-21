import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../compte/app-shell";
import { copyActivityAction } from "./actions";
import styles from "./activities.module.css";

type SearchParams = Promise<{
  vue?: string;
  creation?: string;
  copie?: string;
  publication?: string;
  modification?: string;
  q?: string;
  categorie?: string;
  environnement?: string;
  tri?: string;
}>;

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
    : activitiesQuery.eq("author_id", user.id).eq("visibility", "private");

  const [{ data: activities }, { data: categories }] = await Promise.all([
    activitiesQuery,
    supabase.from("categories").select("id,name").order("name"),
  ]);
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const search = (params.q ?? "").trim().slice(0, 80);
  const categoryFilter = params.categorie ?? "";
  const environmentFilter = params.environnement ?? "";
  const sort = params.tri ?? "recent";
  const filteredActivities = [...(activities ?? [])]
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

      {(params.creation === "ok" || params.copie === "ok") && <p className={styles.success}>{params.creation === "ok" ? "L’activité a été ajoutée à ta galerie." : "La copie a été ajoutée à ta galerie privée."}</p>}
      {params.publication === "ok" && <p className={styles.success}>L’activité a été publiée dans la communauté.</p>}
      {params.modification === "ok" && <p className={styles.success}>L’activité est maintenant publique et visible par la communauté.</p>}

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
            <h2>{activities?.length ? "Aucun résultat" : community ? "Aucune activité partagée" : "Ta galerie est vide"}</h2>
            <p>{activities?.length ? "Essaie de modifier ta recherche ou tes filtres." : community ? "Les activités publiques apparaîtront ici." : "Crée ta première fiche pour commencer ta galerie."}</p>
            {!activities?.length && !community && <Link href="/activites/creer">Créer une activité</Link>}
          </div>
        ) : filteredActivities.map((activity) => (
          <article className={styles.activityCard} key={activity.id}>
            <Link href={`/activites/${activity.id}`} className={styles.cardLink} aria-label={`Consulter ${activity.title}`}>
              <div className={styles.cardTopline}><span>{categoryNames.get(activity.category_id ?? "") ?? "Sans catégorie"}</span><b>{activity.visibility === "public" ? "Publique" : "Privée"}</b></div>
              <h2>{activity.title}</h2>
              {activity.description && <p>{activity.description}</p>}
              <div className={styles.cardMeta}>
                {activity.age_min != null && activity.age_max != null && <span>{activity.age_min}–{activity.age_max} ans</span>}
                {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
                {activity.participants_min != null && activity.participants_max != null && <span>{activity.participants_min}–{activity.participants_max} pers.</span>}
              </div>
            </Link>
            {community && activity.author_id !== user.id && <form action={copyActivityAction}><input type="hidden" name="activityId" value={activity.id} /><button type="submit">Ajouter à ma galerie</button></form>}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
