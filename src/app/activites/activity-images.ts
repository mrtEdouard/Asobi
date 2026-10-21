import "server-only";

import { detectImageKind, IMAGE_MAX_BYTES, type ImageKind } from "@/lib/activity-images/rules";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "activity-images";
const SIGNED_URL_SECONDS = 60 * 60;

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type ActivityImage = { id: string; url: string };
export type ValidImage = { bytes: Uint8Array; kind: ImageKind };

/** Fichiers non vides d'un champ : un champ fichier laisse vide envoie un fichier de 0 octet. */
export function filesFromFormData(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
}

export async function validateImage(file: File): Promise<ValidImage | string> {
  if (file.size > IMAGE_MAX_BYTES) return "Chaque image doit faire 4 Mo maximum.";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageKind(bytes);
  if (!kind) return "Formats acceptés : JPEG, PNG ou WebP.";
  return { bytes, kind };
}

/** Depose les fichiers puis cree les lignes ; en cas d'echec, les fichiers deposes sont retires. */
export async function saveActivityImages(
  supabase: Supabase,
  userId: string,
  activityId: string,
  images: { cover?: ValidImage; photos: ValidImage[] },
) {
  const pending = [
    ...(images.cover ? [{ image: images.cover, isCover: true }] : []),
    ...images.photos.map((image) => ({ image, isCover: false })),
  ];
  if (!pending.length) return true;

  const uploaded: { path: string; isCover: boolean }[] = [];
  for (const { image, isCover } of pending) {
    const path = `${userId}/${activityId}/${crypto.randomUUID()}.${image.kind.extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, image.bytes, {
      contentType: image.kind.contentType,
      upsert: false,
    });
    if (error) {
      console.error("Activity image upload failed", { message: error.message });
      await removeFiles(supabase, uploaded.map((file) => file.path));
      return false;
    }
    uploaded.push({ path, isCover });
  }

  const { error } = await supabase.from("activity_images").insert(
    uploaded.map((file) => ({ activity_id: activityId, storage_path: file.path, is_cover: file.isCover })),
  );
  if (error) {
    console.error("Activity images could not be saved", { code: error.code, message: error.message });
    await removeFiles(supabase, uploaded.map((file) => file.path));
    return false;
  }
  return true;
}

export async function deleteActivityImages(supabase: Supabase, activityId: string, imageIds: string[]) {
  if (!imageIds.length) return true;

  const { data, error } = await supabase.rpc("delete_activity_images", {
    p_activity_id: activityId,
    p_image_ids: imageIds,
  });
  if (error) {
    console.error("Activity images could not be deleted", { code: error.code, message: error.message });
    return false;
  }
  await removeFiles(supabase, data ?? []);
  return true;
}

async function removeFiles(supabase: Supabase, paths: string[]) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("Activity image files could not be removed", { message: error.message });
}

/** Images des activites lisibles par l'utilisateur, avec des liens signes temporaires (bucket prive). */
export async function getActivityImages(supabase: Supabase, activityIds: string[]) {
  const images = new Map<string, { cover?: ActivityImage; photos: ActivityImage[] }>();
  if (!activityIds.length) return images;

  const { data: rows, error } = await supabase
    .from("activity_images")
    .select("id,activity_id,storage_path,is_cover")
    .in("activity_id", activityIds)
    .order("created_at");
  if (error || !rows?.length) {
    if (error) console.error("Activity images could not be loaded", { code: error.code, message: error.message });
    return images;
  }

  const paths = [...new Set(rows.map((row) => row.storage_path))];
  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (signError) {
    console.error("Activity image links could not be created", { message: signError.message });
    return images;
  }
  const urls = new Map((signed ?? []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])));

  for (const row of rows) {
    const url = urls.get(row.storage_path);
    if (!url) continue;
    const entry = images.get(row.activity_id) ?? { photos: [] };
    if (row.is_cover) entry.cover = { id: row.id, url };
    else entry.photos.push({ id: row.id, url });
    images.set(row.activity_id, entry);
  }
  return images;
}
