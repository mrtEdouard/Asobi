"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { GALLERY_MAX_PHOTOS, IMAGE_ACCEPT } from "@/lib/activity-images/rules";
import styles from "../activities.module.css";

export type ExistingImages = {
  cover?: { id: string; url: string };
  photos: { id: string; url: string }[];
};
type SelectedImage = { key: string; file: File; preview: string };

const MAX_SIDE = 1600;

/** Reduit et convertit en WebP avant l'envoi (envoi plus leger). Le serveur revalide toujours le fichier. */
async function compressImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

function readPreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Cle d'affichage locale. Pas de crypto.randomUUID() : il n'existe que sur une page HTTPS ou localhost.
let nextImageKey = 0;

async function prepare(files: File[]): Promise<SelectedImage[]> {
  return Promise.all(files.map(async (original) => {
    const file = await compressImage(original);
    nextImageKey += 1;
    return { key: `image-${nextImageKey}`, file, preview: await readPreview(file) };
  }));
}

/** Le champ fichier envoie ce que contient input.files : on le synchronise avec la selection affichee. */
function syncInput(input: HTMLInputElement | null, images: SelectedImage[]) {
  if (!input) return;
  const transfer = new DataTransfer();
  images.forEach((image) => transfer.items.add(image.file));
  input.files = transfer.files;
}

export function ImageFields({ existing, errors }: { existing?: ExistingImages; errors?: Record<string, string[]> }) {
  const coverInput = useRef<HTMLInputElement>(null);
  const photosInput = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState<SelectedImage | null>(null);
  const [photos, setPhotos] = useState<SelectedImage[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [limitError, setLimitError] = useState<string>();

  // React reinitialise le formulaire apres l'envoi : on vide aussi les apercus.
  useEffect(() => {
    const form = coverInput.current?.form;
    if (!form) return;
    const onReset = () => {
      setCover(null);
      setPhotos([]);
      setRemoved([]);
      setLimitError(undefined);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const keptPhotos = (existing?.photos ?? []).filter((photo) => !removed.includes(photo.id));
  const remaining = GALLERY_MAX_PHOTOS - keptPhotos.length - photos.length;
  const existingCover = existing?.cover && !removed.includes(existing.cover.id) && !cover ? existing.cover : undefined;
  const coverPreview = cover?.preview ?? existingCover?.url;

  function toggleRemoved(id: string) {
    setLimitError(undefined);
    setRemoved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function onCoverChange(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    const [selected] = await prepare([file]);
    setCover(selected);
    syncInput(input, [selected]);
    setBusy(false);
  }

  async function onPhotosChange(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    const accepted = files.slice(0, Math.max(remaining, 0));
    setLimitError(files.length > accepted.length ? `La galerie est limitée à ${GALLERY_MAX_PHOTOS} photos.` : undefined);
    setBusy(true);
    const next = [...photos, ...await prepare(accepted)];
    setPhotos(next);
    syncInput(input, next);
    setBusy(false);
  }

  function removeCover() {
    setCover(null);
    syncInput(coverInput.current, []);
    if (existing?.cover && !removed.includes(existing.cover.id)) toggleRemoved(existing.cover.id);
  }

  function removePhoto(key: string) {
    const next = photos.filter((photo) => photo.key !== key);
    setPhotos(next);
    setLimitError(undefined);
    syncInput(photosInput.current, next);
  }

  return (
    <fieldset className={styles.imageFields} aria-busy={busy}>
      <legend>Photos</legend>
      {removed.map((id) => <input key={id} type="hidden" name="removeImageIds" value={id} />)}

      <div className={styles.coverPicker}>
        {coverPreview ? (
          <div className={styles.coverPreview}>
            <Image src={coverPreview} alt="Aperçu de la photo de couverture" fill unoptimized sizes="430px" />
            <button type="button" onClick={removeCover}>Retirer</button>
          </div>
        ) : (
          <p className={styles.coverEmpty}>Aucune photo de couverture : une illustration par défaut sera affichée.</p>
        )}
        <label className={styles.imageButton}>
          {coverPreview ? "Changer la couverture" : "Ajouter une couverture"}
          <input ref={coverInput} className={styles.srOnly} type="file" name="coverImage" accept={IMAGE_ACCEPT} onChange={(event) => onCoverChange(event.currentTarget)} />
        </label>
        {errors?.coverImage?.[0] && <p className={styles.fieldError}>{errors.coverImage[0]}</p>}
      </div>

      <div className={styles.photoPicker}>
        <span className={styles.photoPickerTitle}>Galerie <small>{keptPhotos.length + photos.length}/{GALLERY_MAX_PHOTOS}</small></span>
        {(existing?.photos.length || photos.length) ? (
          <div className={styles.photoThumbs}>
            {existing?.photos.map((photo) => {
              const isRemoved = removed.includes(photo.id);
              return (
                <div key={photo.id} className={isRemoved ? styles.thumbRemoved : undefined}>
                  <Image src={photo.url} alt="Photo de l’activité" fill unoptimized sizes="140px" />
                  <button type="button" onClick={() => toggleRemoved(photo.id)} aria-pressed={isRemoved}>{isRemoved ? "Garder" : "Retirer"}</button>
                </div>
              );
            })}
            {photos.map((photo) => (
              <div key={photo.key}>
                <Image src={photo.preview} alt="Nouvelle photo" fill unoptimized sizes="140px" />
                <button type="button" onClick={() => removePhoto(photo.key)}>Retirer</button>
              </div>
            ))}
          </div>
        ) : null}
        <label className={`${styles.imageButton} ${remaining <= 0 ? styles.imageButtonDisabled : ""}`}>
          Ajouter des photos
          <input ref={photosInput} className={styles.srOnly} type="file" name="photos" accept={IMAGE_ACCEPT} multiple onClick={(event) => {
            // Un champ desactive ne serait pas envoye : on bloque seulement l'ouverture du selecteur.
            if (remaining <= 0) {
              event.preventDefault();
              setLimitError(`La galerie est limitée à ${GALLERY_MAX_PHOTOS} photos.`);
            }
          }} onChange={(event) => onPhotosChange(event.currentTarget)} />
        </label>
        <small className={styles.imageHint}>JPEG, PNG ou WebP, 4 Mo maximum par photo.{busy ? " Optimisation…" : ""}</small>
        {(limitError ?? errors?.photos?.[0]) && <p className={styles.fieldError}>{limitError ?? errors?.photos?.[0]}</p>}
      </div>
    </fieldset>
  );
}
