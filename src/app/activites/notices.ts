// Messages affiches en notification apres une action (?notice=<code>).
// Le code dans l'URL evite de transmettre un texte libre qu'on pourrait falsifier.
export const notices = {
  "activite-creee": { tone: "success", message: "L’activité a été ajoutée à ta galerie." },
  "activite-publiee": { tone: "success", message: "L’activité a été publiée dans la communauté." },
  "modifications": { tone: "success", message: "Les modifications ont été enregistrées." },
  "activite-publique": { tone: "success", message: "L’activité est maintenant visible par la communauté." },
  "suppression": { tone: "success", message: "L’activité a été supprimée." },
  "suppression-erreur": { tone: "error", message: "L’activité n’a pas pu être supprimée." },
  "ajout-galerie": { tone: "success", message: "L’activité a été ajoutée à ta galerie." },
  "ajout-galerie-erreur": { tone: "error", message: "L’activité n’a pas pu être ajoutée à ta galerie." },
  "retrait-galerie": { tone: "success", message: "L’activité a été retirée de ta galerie." },
  "images-erreur": { tone: "error", message: "L’activité est enregistrée, mais certaines photos n’ont pas pu l’être." },
} as const;

export type NoticeCode = keyof typeof notices;

export function getNotice(code?: string) {
  return code && code in notices ? notices[code as NoticeCode] : undefined;
}

/** Ajoute la notification a l'URL ; n change a chaque fois pour reafficher un meme message. */
export function withNotice(path: string, code: NoticeCode) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}notice=${code}&n=${crypto.randomUUID().slice(0, 8)}`;
}
