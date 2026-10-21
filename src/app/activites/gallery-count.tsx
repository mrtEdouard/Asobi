"use client";

import { useState } from "react";
import styles from "./activities.module.css";

export function GalleryCount({ count }: { count: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.galleryCount}>
      <span className={styles.galleryHeart} aria-hidden="true">♡</span>
      <strong>{count}</strong>
      <span className={styles.countInfo}>
        <button
          type="button"
          aria-label="À quoi correspond ce nombre ?"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          onBlur={() => setOpen(false)}
        >i</button>
        {open && <span role="status">Nombre de personnes qui ont actuellement ajouté cette activité à leur galerie.</span>}
      </span>
    </div>
  );
}
