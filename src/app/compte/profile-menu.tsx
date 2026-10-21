"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "../auth/actions";
import styles from "./home.module.css";

const menuLinks = [
  { href: "/profil", label: "Profil" },
  { href: "/messagerie", label: "Messagerie" },
  { href: "/notifications", label: "Notifications" },
];

export const profileMenuPaths = menuLinks.map((link) => link.href);

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" role="menuitem" disabled={pending} className={styles.logoutItem}>
      {pending ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
}

export function ProfileMenu({ active, icon }: { active: boolean; icon: ReactNode }) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!controlRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={controlRef} className={styles.profileControl}>
      {open && (
        <div id="profile-menu" className={styles.profileMenu} role="menu" aria-label="Menu du profil">
          {menuLinks.map((link) => (
            <Link key={link.href} href={link.href} role="menuitem" onClick={() => setOpen(false)}>{link.label}</Link>
          ))}
          {/* Server Action en POST : la deconnexion ne peut pas etre declenchee par un simple lien. */}
          <form action={logoutAction}>
            <LogoutButton />
          </form>
        </div>
      )}
      <button
        type="button"
        className={`${styles.navItem} ${active || open ? styles.active : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {icon}<span>Profil</span>
      </button>
    </div>
  );
}
