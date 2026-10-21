"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./activities.module.css";

type Photo = { id: string; url: string };

const SWIPE_DISTANCE = 50;

export function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeStart = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const current = photos[index];

  function open(photoIndex: number) {
    setIndex(photoIndex);
    dialogRef.current?.showModal();
  }

  function show(offset: number) {
    setIndex((value) => (value + offset + photos.length) % photos.length);
  }

  return (
    <>
      <div className={styles.photoGrid}>
        {photos.map((photo, photoIndex) => (
          <button key={photo.id} type="button" onClick={() => open(photoIndex)} aria-label={`Agrandir la photo ${photoIndex + 1}`}>
            <Image src={photo.url} alt={`Photo ${photoIndex + 1} de l’activité ${title}`} fill unoptimized sizes="210px" />
          </button>
        ))}
      </div>

      {/* <dialog> gere le focus, la touche Echap et bloque l'arriere-plan. */}
      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label={`Photos de l’activité ${title}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") show(1);
          if (event.key === "ArrowLeft") show(-1);
        }}
        onTouchStart={(event) => {
          // Un seul doigt : deux doigts servent au zoom natif.
          swipeStart.current = event.touches.length === 1 ? event.touches[0].clientX : null;
        }}
        onTouchEnd={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (start === null || photos.length < 2 || (window.visualViewport?.scale ?? 1) > 1) return;
          const distance = event.changedTouches[0].clientX - start;
          if (Math.abs(distance) >= SWIPE_DISTANCE) show(distance < 0 ? 1 : -1);
        }}
      >
        {current && (
          <figure>
            <Image src={current.url} alt={`Photo ${index + 1} de l’activité ${title}`} fill unoptimized sizes="100vw" />
            {photos.length > 1 && <figcaption>{index + 1} / {photos.length}</figcaption>}
          </figure>
        )}
        <button type="button" className={styles.lightboxClose} onClick={() => dialogRef.current?.close()} aria-label="Fermer">×</button>
        {photos.length > 1 && (
          <>
            <button type="button" className={styles.lightboxPrevious} onClick={() => show(-1)} aria-label="Photo précédente">‹</button>
            <button type="button" className={styles.lightboxNext} onClick={() => show(1)} aria-label="Photo suivante">›</button>
          </>
        )}
      </dialog>
    </>
  );
}
