import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getActivityTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityId: string,
) {
  const [{ data: objectiveLinks }, { data: equipmentLinks }] = await Promise.all([
    supabase.from("activity_objectives").select("objective_id").eq("activity_id", activityId),
    supabase.from("activity_equipment").select("equipment_id").eq("activity_id", activityId),
  ]);

  const objectiveIds = (objectiveLinks ?? []).map((link) => link.objective_id);
  const equipmentIds = (equipmentLinks ?? []).map((link) => link.equipment_id);
  const [{ data: objectives }, { data: equipment }] = await Promise.all([
    objectiveIds.length
      ? supabase.from("pedagogical_objectives").select("name").in("id", objectiveIds).order("name")
      : Promise.resolve({ data: [] as { name: string }[] }),
    equipmentIds.length
      ? supabase.from("equipment_items").select("name").in("id", equipmentIds).order("name")
      : Promise.resolve({ data: [] as { name: string }[] }),
  ]);

  return {
    objectives: (objectives ?? []).map((item) => item.name),
    equipment: (equipment ?? []).map((item) => item.name),
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
