"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { GALLERY_MAX_PHOTOS } from "@/lib/activity-images/rules";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { withNotice } from "./notices";
import { deleteActivityImages, filesFromFormData, saveActivityImages, validateImage, type ValidImage } from "./activity-images";

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

/** Valide la couverture et les nouvelles photos avant tout enregistrement. */
async function imagesFromFormData(formData: FormData, keptPhotos: number) {
  const errors: Record<string, string[]> = {};
  const coverFile = filesFromFormData(formData, "coverImage")[0];
  const photoFiles = filesFromFormData(formData, "photos");

  let cover: ValidImage | undefined;
  if (coverFile) {
    const result = await validateImage(coverFile);
    if (typeof result === "string") errors.coverImage = [result];
    else cover = result;
  }

  const photos: ValidImage[] = [];
  if (keptPhotos + photoFiles.length > GALLERY_MAX_PHOTOS) {
    errors.photos = [`La galerie est limitée à ${GALLERY_MAX_PHOTOS} photos.`];
  } else {
    for (const file of photoFiles) {
      const result = await validateImage(file);
      if (typeof result === "string") {
        errors.photos = [result];
        break;
      }
      photos.push(result);
    }
  }

  return { cover, photos, errors: Object.keys(errors).length ? errors : undefined };
}

export async function createActivityAction(
  _state: ActivityActionState,
  formData: FormData,
): Promise<ActivityActionState> {
  const user = await requireUser();

  const parsed = activitySchema.safeParse(activityFromFormData(formData));
  const images = await imagesFromFormData(formData, 0);

  if (!parsed.success || images.errors) {
    return errorState("Vérifie les champs du formulaire.", {
      ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
      ...images.errors,
    });
  }

  const activity = parsed.data;
  const supabase = await createClient();
  const { data: createdId, error } = await supabase.rpc("create_activity_with_tags", {
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

  const imagesSaved = await saveActivityImages(supabase, user.id, createdId, images);

  revalidatePath("/activites");
  revalidatePath("/compte");
  if (!imagesSaved) redirect(withNotice(`/activites/${createdId}`, "images-erreur"));
  redirect(activity.visibility === "public"
    ? withNotice("/activites?vue=communaute", "activite-publiee")
    : withNotice("/activites?vue=mes", "activite-creee"));
}

export async function updateActivityAction(
  _state: ActivityActionState,
  formData: FormData,
): Promise<ActivityActionState> {
  const user = await requireUser();
  const activityId = z.string().uuid().safeParse(formData.get("activityId"));
  const removedImageIds = z.array(z.string().uuid()).max(20).safeParse(formData.getAll("removeImageIds"));
  const parsed = activitySchema.safeParse(activityFromFormData(formData));

  if (!activityId.success || !removedImageIds.success) {
    return errorState("Vérifie les champs du formulaire.");
  }

  const supabase = await createClient();
  const { data: currentImages } = await supabase
    .from("activity_images")
    .select("id,is_cover")
    .eq("activity_id", activityId.data);
  const keptPhotos = (currentImages ?? []).filter((image) => !image.is_cover && !removedImageIds.data.includes(image.id)).length;
  const images = await imagesFromFormData(formData, keptPhotos);

  if (!parsed.success || images.errors) {
    return errorState("Vérifie les champs du formulaire.", {
      ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
      ...images.errors,
    });
  }

  const activity = parsed.data;
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

  // Une nouvelle couverture remplace l'ancienne.
  const imageIdsToDelete = [
    ...removedImageIds.data,
    ...(images.cover ? (currentImages ?? []).filter((image) => image.is_cover).map((image) => image.id) : []),
  ];
  const imagesDeleted = await deleteActivityImages(supabase, activityId.data, [...new Set(imageIdsToDelete)]);
  const imagesSaved = imagesDeleted && await saveActivityImages(supabase, user.id, activityId.data, images);

  revalidatePath("/activites");
  revalidatePath("/compte");
  revalidatePath(`/activites/${activityId.data}`);
  if (!imagesSaved) redirect(withNotice(`/activites/${activityId.data}`, "images-erreur"));
  redirect(activity.visibility === "public"
    ? withNotice("/activites?vue=communaute", "activite-publique")
    : withNotice(`/activites/${activityId.data}`, "modifications"));
}

/** Page d'ou vient l'action : on y revient apres l'ajout ou le retrait en galerie. */
function galleryReturnPath(formData: FormData, activityId: string) {
  switch (formData.get("returnTo")) {
    case "fiche": return `/activites/${activityId}`;
    case "communaute": return "/activites?vue=communaute";
    default: return "/activites?vue=mes";
  }
}

export async function saveActivityAction(formData: FormData) {
  await requireUser();
  const parsed = z.string().uuid().safeParse(formData.get("activityId"));
  if (!parsed.success) return;

  const supabase = await createClient();
  // La RLS refuse ses propres activites et celles qui ne sont pas publiques.
  const { error } = await supabase.from("activity_saves").insert({ activity_id: parsed.data });
  const alreadySaved = error?.code === "23505";
  if (error && !alreadySaved) {
    console.error("Activity save failed", { code: error.code, message: error.message });
    redirect(withNotice(galleryReturnPath(formData, parsed.data), "ajout-galerie-erreur"));
  }

  revalidatePath("/activites");
  revalidatePath(`/activites/${parsed.data}`);
  redirect(withNotice(galleryReturnPath(formData, parsed.data), "ajout-galerie"));
}

export async function unsaveActivityAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.string().uuid().safeParse(formData.get("activityId"));
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_saves")
    .delete()
    .eq("user_id", user.id)
    .eq("activity_id", parsed.data);
  if (error) console.error("Activity unsave failed", { code: error.code, message: error.message });

  revalidatePath("/activites");
  revalidatePath(`/activites/${parsed.data}`);
  redirect(withNotice(galleryReturnPath(formData, parsed.data), "retrait-galerie"));
}

export async function deleteActivityAction(formData: FormData) {
  await requireUser();
  const parsed = z.string().uuid().safeParse(formData.get("activityId"));
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_activity_from_gallery", {
    p_activity_id: parsed.data,
  });

  if (error) {
    console.error("Activity removal failed", { code: error.code, message: error.message });
    redirect(withNotice(`/activites/${parsed.data}`, "suppression-erreur"));
  }

  revalidatePath("/activites");
  revalidatePath("/compte");
  redirect(withNotice("/activites?vue=mes", "suppression"));
}
