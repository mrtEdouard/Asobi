import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

/** Premiere lecture reelle : Next.js interroge Supabase cote serveur. */
async function CategoryList() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <>
      {error ? (
        <p role="alert" className="mt-6">
          Les catégories sont momentanément indisponibles. Réessaie plus tard.
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-6">Aucune catégorie pour le moment.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {categories.map((category) => (
            <li key={category.id} className="rounded-xl border border-teal-200 p-5">
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function CategoriesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold text-teal-700">Asobi</p>
      <h1 className="mt-3 text-3xl font-bold">Les catégories d’activités</h1>
      <Suspense fallback={<p className="mt-6">Chargement des catégories…</p>}>
        <CategoryList />
      </Suspense>
    </main>
  );
}
