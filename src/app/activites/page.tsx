import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../compte/app-shell";
import { copyActivityAction } from "./actions";
import styles from "./activities.module.css";

type SearchParams = Promise<{ vue?: string; creation?: string; copie?: string }>;

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
    ? activitiesQuery.eq("visibility", "public").neq("author_id", user.id)
    : activitiesQuery.eq("author_id", user.id);

  const [{ data: activities }, { data: categories }] = await Promise.all([
    activitiesQuery,
    supabase.from("categories").select("id,name").order("name"),
  ]);
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));

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

      <section className={styles.list} aria-live="polite">
        {!activities?.length ? (
          <div className={styles.empty}>
            <h2>{community ? "Aucune activité partagée" : "Ta galerie est vide"}</h2>
            <p>{community ? "Les activités publiques apparaîtront ici." : "Crée ta première fiche pour commencer ta galerie."}</p>
            {!community && <Link href="/activites/creer">Créer une activité</Link>}
          </div>
        ) : activities.map((activity) => (
          <article className={styles.activityCard} key={activity.id}>
            <div className={styles.cardTopline}><span>{categoryNames.get(activity.category_id ?? "") ?? "Sans catégorie"}</span><b>{activity.visibility === "public" ? "Publique" : "Privée"}</b></div>
            <h2>{activity.title}</h2>
            {activity.description && <p>{activity.description}</p>}
            <div className={styles.cardMeta}>
              {activity.age_min != null && activity.age_max != null && <span>{activity.age_min}–{activity.age_max} ans</span>}
              {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
              {activity.participants_min != null && activity.participants_max != null && <span>{activity.participants_min}–{activity.participants_max} pers.</span>}
            </div>
            {community && <form action={copyActivityAction}><input type="hidden" name="activityId" value={activity.id} /><button type="submit">Ajouter à ma galerie</button></form>}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
