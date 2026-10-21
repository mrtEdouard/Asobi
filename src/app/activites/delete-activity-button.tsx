"use client";

import { useFormStatus } from "react-dom";
import { deleteActivityAction } from "./actions";
import styles from "./activities.module.css";

export function DeleteActivityButton({ activityId, isCopy }: { activityId: string; isCopy: boolean }) {
  return (
    <form
      action={deleteActivityAction}
      className={styles.deleteForm}
      onSubmit={(event) => {
        const message = isCopy
          ? "Retirer cette activité de ta galerie ?"
          : "Supprimer cette activité ? Si elle est publique, elle disparaîtra aussi de la communauté.";
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="activityId" value={activityId} />
      <DeleteButtonLabel isCopy={isCopy} />
    </form>
  );
}

function DeleteButtonLabel({ isCopy }: { isCopy: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Suppression…" : isCopy ? "Retirer de ma galerie" : "Supprimer l’activité"}
    </button>
  );
}
