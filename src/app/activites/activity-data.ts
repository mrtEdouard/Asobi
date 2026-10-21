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
