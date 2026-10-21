import Image from "next/image";
import type { ReactNode } from "react";
import animixLogo from "../../../logo-animix.png";
import { BottomNavigation } from "./bottom-navigation";
import styles from "./home.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className={styles.viewport}>
      <div className={styles.phone}>
        <div className={styles.appContent}>
          <header className={styles.header}>
            <Image className={styles.logo} src={animixLogo} alt="Animix" priority sizes="230px" />
          </header>
          {children}
        </div>
        <BottomNavigation />
      </div>
    </main>
  );
}
