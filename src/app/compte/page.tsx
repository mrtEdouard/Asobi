import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import animixLogo from "../../../logo-animix.png";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? user.user_metadata?.username ?? "";

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
              <Link href="/activites" className={styles.seeAll}>Tout voir <ArrowIcon /></Link>
            </div>
            <div className={styles.carousel} aria-label="Activités récentes">
              <article className={styles.activityCard}>
                <div className={styles.activityVisual}>
                  <Image className={styles.cardImage} src="/images/cards/activite-fresque.webp" alt="Des enfants réalisent ensemble une fresque colorée" fill sizes="180px" />
                  <span className={styles.activityBadge}>6–10 ans</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.tags}><span>Créativité</span><span>Intérieur</span></div>
                  <h3>La fresque des émotions</h3>
                  <p>Une activité collective pour créer, échanger et mieux se connaître.</p>
                  <div className={styles.meta}><span>⏱ 45 min</span><span>👥 6–16</span></div>
                </div>
              </article>
              <article className={styles.activityCard}>
                <div className={styles.activityVisual}>
                  <Image className={styles.cardImage} src="/images/cards/activite-explorateurs.webp" alt="Des enfants participent à un jeu d’orientation en plein air" fill sizes="180px" />
                  <span className={styles.activityBadge}>8–12 ans</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.tags}><span>Coopération</span><span>Extérieur</span></div>
                  <h3>Le défi des explorateurs</h3>
                  <p>Des énigmes en équipe pour observer, s’orienter et relever des défis.</p>
                  <div className={styles.meta}><span>⏱ 60 min</span><span>👥 8–20</span></div>
                </div>
              </article>
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
