"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/auth/schemas";

function errorState(message: string, errors?: Record<string, string[]>): AuthFormState {
  return { status: "error", message, errors };
}

function authMessage(code?: string) {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Confirme d’abord ton adresse e-mail.";
    case "user_already_exists":
      return "Un compte existe déjà avec cette adresse e-mail.";
    case "over_email_send_rate_limit":
      return "Trop de messages ont été demandés. Réessaie dans quelques minutes.";
    default:
      return "L’authentification a échoué. Réessaie dans un instant.";
  }
}

export async function loginAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return errorState("Vérifie les champs du formulaire.", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return errorState(authMessage(error.code));

  redirect("/compte");
}

export async function signupAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    birthDate: formData.get("birthDate"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return errorState("Vérifie les champs du formulaire.", parsed.error.flatten().fieldErrors);
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        username: parsed.data.username,
        birth_date: parsed.data.birthDate,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("username")) {
      return errorState("Ce pseudo est déjà utilisé.", { username: ["Choisis un autre pseudo."] });
    }
    return errorState(authMessage(error.code));
  }

  // Quand la confirmation d'e-mail est desactivee, Supabase ouvre directement la session.
  if (data.session) redirect("/compte");

  return {
    status: "success",
    message: "Compte créé. Ouvre le lien reçu par e-mail pour confirmer ton inscription.",
  };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
