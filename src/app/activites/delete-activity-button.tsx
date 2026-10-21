"use client";

import { useFormStatus } from "react-dom";
import { deleteActivityAction } from "./actions";
import styles from "./activities.module.css";

export function DeleteActivityButton({ activityId, compact = false }: { activityId: string; compact?: boolean }) {
  return (
    <form
      action={deleteActivityAction}
      className={`${styles.deleteForm} ${compact ? styles.deleteFormCompact : ""}`}
      onSubmit={(event) => {
        const message = "Supprimer cette activité ? Si elle est publique, elle disparaîtra aussi de la communauté et des galeries où elle a été ajoutée.";
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="activityId" value={activityId} />
      <DeleteButtonLabel compact={compact} />
    </form>
  );
}

function DeleteButtonLabel({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Suppression…" : compact ? "Supprimer" : "Supprimer l’activité"}
    </button>
  );
}
