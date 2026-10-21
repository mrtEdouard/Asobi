// Regles partagees entre le formulaire (navigateur) et les Server Actions.
// Elles doivent rester alignees avec le bucket et le trigger de la migration activity_images.
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const GALLERY_MAX_PHOTOS = 6;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export type ImageKind = { extension: "jpg" | "png" | "webp"; contentType: string };

/** Reconnait le format a partir des premiers octets : le type MIME envoye par le navigateur peut etre falsifie. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return { extension: "jpg", contentType: "image/jpeg" };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { extension: "png", contentType: "image/png" };
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}
