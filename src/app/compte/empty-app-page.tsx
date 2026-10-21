import Image from "next/image";
import { Suspense } from "react";
import animixLogo from "../../../logo-animix.png";
import { requireUser } from "@/lib/auth/session";
import { BottomNavigation } from "./bottom-navigation";
import styles from "./home.module.css";

export function ProtectedEmptyAppPage({ title }: { title: string }) {
  return (
    <Suspense fallback={<main className={styles.loading}>Chargement d’Animix…</main>}>
      <EmptyAppPage title={title} />
    </Suspense>
  );
}

async function EmptyAppPage({ title }: { title: string }) {
  await requireUser();

  return (
    <main className={styles.viewport}>
      <div className={styles.phone}>
        <div className={styles.emptyContent}>
          <header className={styles.header}>
            <Image className={styles.logo} src={animixLogo} alt="Animix" priority sizes="230px" />
          </header>
          <h1>{title}</h1>
        </div>
        <BottomNavigation />
      </div>
    </main>
  );
}
