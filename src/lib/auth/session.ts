import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Identite du membre connecte, lue dans le jeton de session.
 * getClaims() verifie la signature du JWT localement (cles publiques du projet, mises en cache),
 * sans appel reseau au serveur Auth comme getUser() : une requete de moins par page.
 * Les droits restent controles par la RLS dans la base.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) return null;
  return {
    id: data.claims.sub,
    user_metadata: (data.claims.user_metadata ?? {}) as Record<string, unknown>,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}
