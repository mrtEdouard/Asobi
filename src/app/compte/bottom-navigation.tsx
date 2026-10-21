"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CreateMenu } from "./create-menu";
import styles from "./home.module.css";

type IconName = "home" | "activities" | "offers" | "profile";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    activities: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    offers: <><path d="M4 7h16v13H4z"/><path d="M9 7V4h6v3M4 12h16M10 12v2h4v-2"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/compte") return pathname === "/compte";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();

  const links: Array<{ href: string; label: string; icon: IconName }> = [
    { href: "/compte", label: "Accueil", icon: "home" },
    { href: "/activites", label: "Activités", icon: "activities" },
    { href: "/offres", label: "Offres", icon: "offers" },
    { href: "/profil", label: "Profil", icon: "profile" },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Navigation principale">
      {links.slice(0, 2).map((link) => {
        const active = isActive(pathname, link.href);
        return <Link key={link.href} href={link.href} className={`${styles.navItem} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}><Icon name={link.icon} /><span>{link.label}</span></Link>;
      })}
      <CreateMenu />
      {links.slice(2).map((link) => {
        const active = isActive(pathname, link.href);
        return <Link key={link.href} href={link.href} className={`${styles.navItem} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}><Icon name={link.icon} /><span>{link.label}</span></Link>;
      })}
    </nav>
  );
}
