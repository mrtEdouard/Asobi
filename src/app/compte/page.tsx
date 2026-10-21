import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import animixLogo from "../../../logo-animix.png";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActivityAuthors } from "../activites/activity-data";
import { BottomNavigation } from "./bottom-navigation";
import styles from "./home.module.css";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PageFallback() {
  return <main className={styles.loading}>Chargement d’Animix…</main>;
}

export default function AccountPage() {
  return <Suspense fallback={<PageFallback />}><Home /></Suspense>;
}

async function Home() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: recentActivities }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("activities").select("*").eq("visibility", "public").is("deleted_at", null).order("published_at", { ascending: false }).limit(6),
    supabase.from("categories").select("id,name"),
  ]);

  const username = profile?.username ?? user.user_metadata?.username ?? "";
  const authorNames = await getActivityAuthors(supabase, (recentActivities ?? []).map((activity) => activity.id));
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const activityImages = ["/images/cards/activite-fresque.webp", "/images/cards/activite-explorateurs.webp"];
  const environmentNames = { indoor: "Intérieur", outdoor: "Extérieur", both: "Intérieur/extérieur" };

  return (
    <main className={styles.viewport}>
      <div className={styles.phone}>
        <div className={styles.content}>
          <header className={styles.header}>
            <Image className={styles.logo} src={animixLogo} alt="Animix" priority sizes="230px" />
          </header>

          <section className={styles.welcome}>
            <h1>Bonjour{username ? `, ${username}` : ""} <span aria-hidden="true">👋</span></h1>
          </section>

          <section className={styles.section} aria-labelledby="activities-title">
            <div className={styles.sectionHeading}>
              <h2 id="activities-title">Dernières activités partagées</h2>
              <Link href="/activites?vue=communaute" className={styles.seeAll}>Tout voir <ArrowIcon /></Link>
            </div>
            <div className={styles.carousel} aria-label="Activités récentes">
              {!recentActivities?.length ? <p className={styles.carouselEmpty}>Les prochaines activités partagées apparaîtront ici.</p> : recentActivities.map((activity, index) => (
                <Link href={`/activites/${activity.id}`} className={styles.activityCard} key={activity.id}>
                  <div className={styles.activityVisual}>
                    <Image className={styles.cardImage} src={activityImages[index % activityImages.length]} alt="" fill sizes="180px" />
                    {activity.age_min != null && activity.age_max != null && <span className={styles.activityBadge}>{activity.age_min}–{activity.age_max} ans</span>}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.tags}>
                      <span>{categoryNames.get(activity.category_id ?? "") ?? "Activité"}</span>
                      {activity.environment && <span>{environmentNames[activity.environment]}</span>}
                    </div>
                    <h3>{activity.title}</h3>
                    <span className={styles.activityAuthor}>Par @{authorNames.get(activity.author_id) ?? "membre"}</span>
                    <p>{activity.description}</p>
                    <div className={styles.meta}>
                      {activity.duration_minutes && <span>⏱ {activity.duration_minutes} min</span>}
                      {activity.participants_min != null && activity.participants_max != null && <span>👥 {activity.participants_min}–{activity.participants_max}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="offers-title">
            <div className={styles.sectionHeading}>
              <h2 id="offers-title">Dernières offres</h2>
              <Link href="/offres" className={styles.seeAll}>Tout voir <ArrowIcon /></Link>
            </div>
            <div className={styles.carousel} aria-label="Offres récentes">
              <article className={styles.offerCard}>
                <div className={styles.offerVisual}>
                  <Image className={styles.cardImage} src="/images/cards/offre-sejour-nature.webp" alt="Un groupe prépare une activité en montagne près d’un lac" fill sizes="180px" />
                </div>
                <div className={styles.offerContent}>
                  <div className={styles.offerTopline}><span>Colonie de vacances</span><b>Nouveau</b></div>
                  <h3>Animateur·rice séjour nature</h3>
                  <p>Annecy · du 8 au 21 juillet</p>
                  <div className={styles.tags}><span>BAFA</span><span>Débutants acceptés</span></div>
                </div>
                <span className={styles.offerArrow}><ArrowIcon /></span>
              </article>
              <article className={styles.offerCard}>
                <div className={styles.offerVisual}>
                  <Image className={styles.cardImage} src="/images/cards/offre-accueil-loisirs.webp" alt="Une animatrice encadre un jeu collectif en accueil de loisirs" fill sizes="180px" />
                </div>
                <div className={styles.offerContent}>
                  <div className={styles.offerTopline}><span>Accueil de loisirs</span><b>Nouveau</b></div>
                  <h3>Animateur·rice enfance</h3>
                  <p>Lyon · du 5 au 30 août</p>
                  <div className={styles.tags}><span>BAFA</span><span>Sans hébergement</span></div>
                </div>
                <span className={styles.offerArrow}><ArrowIcon /></span>
              </article>
            </div>
          </section>
        </div>

        <BottomNavigation />
      </div>
    </main>
  );
}
