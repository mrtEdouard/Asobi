/** Configuration publique : jamais de cle service_role ou secret ici. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase non configure : renseigner les deux variables de .env.local.",
    );
  }

  return { url, key };
}
