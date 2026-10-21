"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ActivityActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

function activityFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    ageMin: formData.get("ageMin"),
    ageMax: formData.get("ageMax"),
    participantsMin: formData.get("participantsMin"),
    participantsMax: formData.get("participantsMax"),
    durationMinutes: formData.get("durationMinutes"),
    environment: formData.get("environment"),
    objectives: formData.getAll("objectives"),
    equipment: formData.getAll("equipment"),
    preparation: formData.get("preparation"),
    safety: formData.get("safety"),
    visibility: formData.get("visibility"),
  };
}

const tags = z.array(z.string().trim().min(1).max(100)).max(20, "Limite-toi à 20 mots-clés.");

const activitySchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(180),
  description: z.string().trim().min(10, "Décris l’activité en quelques mots.").max(1500),
  categoryId: z.string().uuid("Choisis une catégorie."),
  ageMin: z.coerce.number().int().min(0).max(99),
  ageMax: z.coerce.number().int().min(0).max(99),
  participantsMin: z.coerce.number().int().min(1).max(999),
  participantsMax: z.coerce.number().int().min(1).max(999),
  durationMinutes: z.coerce.number().int().min(5, "Indique une durée d’au moins 5 minutes.").max(1440),
  environment: z.enum(["indoor", "outdoor", "both"]),
  objectives: tags,
  equipment: tags,
  preparation: z.string().trim().min(10, "Explique comment préparer et mener l’activité.").max(5000),
  safety: z.string().trim().min(5, "Ajoute au moins un point de vigilance.").max(3000),
  visibility: z.enum(["private", "public"]),
}).superRefine((activity, context) => {
  if (activity.ageMax < activity.ageMin) context.addIssue({ code: "custom", path: ["ageMax"], message: "L’âge maximum doit être supérieur au minimum." });
  if (activity.participantsMax < activity.participantsMin) context.addIssue({ code: "custom", path: ["participantsMax"], message: "Le maximum doit être supérieur au minimum." });
});

function errorState(message: string, errors?: Record<string, string[]>): ActivityActionState {
  return { status: "error", message, errors };
}

export async function createActivityAction(
  _state: ActivityActionState,
  formData: FormData,
): Promise<ActivityActionState> {
  await requireUser();

  const parsed = activitySchema.safeParse(activityFromFormData(formData));

  if (!parsed.success) {
    return errorState("Vérifie les champs du formulaire.", parsed.error.flatten().fieldErrors);
  }

  const activity = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_activity_with_tags", {
    p_category_id: activity.categoryId,
    p_title: activity.title,
    p_description: activity.description,
    p_age_min: activity.ageMin,
    p_age_max: activity.ageMax,
    p_participants_min: activity.participantsMin,
    p_participants_max: activity.participantsMax,
    p_duration_minutes: activity.durationMinutes,
    p_environment: activity.environment,
    p_preparation: activity.preparation,
    p_safety: activity.safety,
    p_visibility: activity.visibility,
    p_objectives: activity.objectives,
    p_equipment: activity.equipment,
  });

  if (error) {
    console.error("Activity creation failed", { code: error.code, message: error.message, details: error.details });
    if (error.code === "PGRST202") {
      return errorState("La création d’activité n’est pas encore activée sur la base de données.");
    }
    return errorState("L’activité n’a pas pu être enregistrée. Réessaie dans un instant.");
  }

  revalidatePath("/activites");
  revalidatePath("/compte");
  redirect(activity.visibility === "public"
    ? "/activites?vue=communaute&publication=ok"
    : "/activites?vue=mes&creation=ok");
}

export async function updateActivityAction(
  _state: ActivityActionState,
  formData: FormData,
): Promise<ActivityActionState> {
  await requireUser();
  const activityId = z.string().uuid().safeParse(formData.get("activityId"));
  const parsed = activitySchema.safeParse(activityFromFormData(formData));

  if (!activityId.success || !parsed.success) {
    return errorState(
      "Vérifie les champs du formulaire.",
      parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    );
  }

  const activity = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_activity_with_tags", {
    p_activity_id: activityId.data,
    p_category_id: activity.categoryId,
    p_title: activity.title,
    p_description: activity.description,
    p_age_min: activity.ageMin,
    p_age_max: activity.ageMax,
    p_participants_min: activity.participantsMin,
    p_participants_max: activity.participantsMax,
    p_duration_minutes: activity.durationMinutes,
    p_environment: activity.environment,
    p_preparation: activity.preparation,
    p_safety: activity.safety,
    p_visibility: activity.visibility,
    p_objectives: activity.objectives,
    p_equipment: activity.equipment,
  });

  if (error) {
    console.error("Activity update failed", { code: error.code, message: error.message, details: error.details });
    return errorState("Les modifications n’ont pas pu être enregistrées.");
  }

  revalidatePath("/activites");
  revalidatePath("/compte");
  revalidatePath(`/activites/${activityId.data}`);
  redirect(activity.visibility === "public"
    ? "/activites?vue=communaute&modification=ok"
    : `/activites/${activityId.data}?modification=ok`);
}

export async function copyActivityAction(formData: FormData) {
  await requireUser();
  const parsed = z.string().uuid().safeParse(formData.get("activityId"));
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("copy_public_activity", { p_source_id: parsed.data });
  if (error) return;

  revalidatePath("/activites");
  redirect("/activites?vue=mes&copie=ok");
}
