import { z } from "zod";


//Zod sert à la validation des données , on y définit les règles de ce qu'on veut avoir
const email = z
  .string()
  .trim()
  .min(1, "L’adresse e-mail est obligatoire.")
  .email("L’adresse e-mail n’est pas valide.");

const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[A-Za-zÀ-ÿ]/, "Ajoute au moins une lettre.")
  .regex(/[0-9]/, "Ajoute au moins un chiffre.");

const username = z
  .string()
  .trim()
  .min(3, "Le pseudo doit contenir au moins 3 caractères.")
  .max(40, "Le pseudo ne peut pas dépasser 40 caractères.")
  .regex(
    /^[\p{L}\p{N}_][\p{L}\p{N}_.-]*$/u,
    "Utilise uniquement des lettres, chiffres, points, tirets ou underscores.",
  );

const birthDate = z
  .string()
  .date("La date de naissance n’est pas valide.")
  .refine((value) => {
    const today = new Date();
    const minimum = new Date(
      Date.UTC(today.getUTCFullYear() - 16, today.getUTCMonth(), today.getUTCDate()),
    );
    return new Date(`${value}T00:00:00.000Z`) <= minimum;
  }, "Il faut avoir au moins 16 ans pour créer un compte.");

export const loginSchema = z.object({ email, password: z.string().min(1, "Le mot de passe est obligatoire.") });

export const signupSchema = z
  .object({
    username,
    birthDate,
    email,
    password,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialAuthFormState: AuthFormState = { status: "idle" };
