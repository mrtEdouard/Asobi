"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./home.module.css";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CreateMenu() {
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
    <div ref={controlRef} className={styles.createControl}>
      {open && (
        <div id="create-menu" className={styles.createMenu} role="menu" aria-label="Créer un contenu">
          <Link href="/activites/creer" role="menuitem" onClick={() => setOpen(false)}>Une activité</Link>
          <Link href="/offres/creer" role="menuitem" onClick={() => setOpen(false)}>Une offre</Link>
        </div>
      )}
      <button
        className={styles.createButton}
        type="button"
        aria-label={open ? "Fermer le menu de création" : "Créer"}
        aria-expanded={open}
        aria-controls="create-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
