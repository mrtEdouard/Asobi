"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Bouton d'envoi qui montre que l'action est en cours et bloque un double clic. */
export function SubmitButton({ children, pendingLabel, className }: { children: ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
