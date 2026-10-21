import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getActivityTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityId: string,
) {
  // Jointure PostgREST via les cles etrangeres : une requete par liste au lieu de deux.
  const [{ data: objectiveLinks }, { data: equipmentLinks }] = await Promise.all([
    supabase.from("activity_objectives").select("pedagogical_objectives(name)").eq("activity_id", activityId),
    supabase.from("activity_equipment").select("equipment_items(name)").eq("activity_id", activityId),
  ]);
  const sortedNames = (names: (string | undefined)[]) =>
    names.filter((name): name is string => Boolean(name)).sort((left, right) => left.localeCompare(right, "fr"));

  return {
    objectives: sortedNames((objectiveLinks ?? []).map((link) => link.pedagogical_objectives?.name)),
    equipment: sortedNames((equipmentLinks ?? []).map((link) => link.equipment_items?.name)),
  };
}

export async function getActivityAuthors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityIds: string[],
) {
  if (!activityIds.length) return new Map<string, string>();

  const { data, error } = await supabase.rpc("get_activity_authors", {
    p_activity_ids: activityIds,
  });

  if (error) {
    console.error("Activity authors could not be loaded", {
      code: error.code,
      message: error.message,
    });
    return new Map<string, string>();
  }

  return new Map((data ?? []).map((author) => [author.id, author.username]));
}

export async function getActivityGalleryCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityIds: string[],
) {
  if (!activityIds.length) return new Map<string, number>();

  const { data, error } = await supabase.rpc("get_activity_gallery_counts", {
    p_activity_ids: [...new Set(activityIds)],
  });

  if (error) {
    console.error("Activity gallery counts could not be loaded", {
      code: error.code,
      message: error.message,
    });
    return new Map<string, number>();
  }

  return new Map((data ?? []).map((item) => [item.activity_id, Number(item.save_count)]));
}
