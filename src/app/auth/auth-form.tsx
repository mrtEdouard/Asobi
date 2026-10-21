"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import logoImage from "../../../logo.png";
import { initialAuthFormState, type AuthFormState } from "@/lib/auth/schemas";
import { loginAction, signupAction } from "./actions";
import styles from "./auth-form.module.css";

function FieldError({ state, name }: { state: AuthFormState; name: string }) {
  const messages = state.errors?.[name];
  if (!messages?.length) return null;
  return <p id={`${name}-error`} className={styles.error}>{messages[0]}</p>;
}

function HelpInfo({ id, children }: { id: string; children: string }) {
  return (
    <span className={styles.helpInfo}>
      <button type="button" className={styles.infoButton} aria-label={`Information : ${children}`} aria-describedby={id}>i</button>
      <span id={id} role="tooltip" className={styles.helpTooltip}>{children}</span>
    </span>
  );
}

function SubmitButton({ pending, pendingLabel, children }: { pending: boolean; pendingLabel: string; children: string }) {
  return <button type="submit" className={styles.primaryButton} disabled={pending}>{pending ? pendingLabel : children}</button>;
}

function PasswordField({
  id,
  label,
  autoComplete,
  state,
  help,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  state: AuthFormState;
  help?: string;
}) {
  const [visible, setVisible] = useState(false);
  const hasError = Boolean(state.errors?.[id]?.length);
  const describedBy = [help ? `${id}-help` : null, hasError ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id}>{label}</label>
        {help && <HelpInfo id={`${id}-help`}>{help}</HelpInfo>}
      </div>
      <div className={styles.passwordControl}>
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={id === "password" && autoComplete === "new-password" ? 8 : undefined}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          required
        />
        <button
          type="button"
          className={styles.revealButton}
          aria-label={visible ? `Masquer ${label.toLowerCase()}` : `Afficher ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>
      <FieldError state={state} name={id} />
    </div>
  );
}
// Calcul si t'as bien minimum 16 ans (sert aussi pour déterminer si tu as droit à la discussion ou pas)
function calculateMaximumBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 16);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useFocusFirstError(state: AuthFormState) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return formRef;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialAuthFormState);
  const formRef = useFocusFirstError(state);
  return (
    <AuthShell title="Se connecter" compact>
      <form ref={formRef} action={action} className={styles.form} aria-busy={pending} noValidate>
        <div className={styles.formFields}>
          <div className={styles.field}>
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="prenom@exemple.fr" aria-invalid={Boolean(state.errors?.email)} aria-describedby={state.errors?.email ? "email-error" : undefined} required />
            <FieldError state={state} name="email" />
          </div>
          <PasswordField id="password" label="Mot de passe" autoComplete="current-password" state={state} />
          <div aria-live="polite">{state.message && <Notice state={state} />}</div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href="/">Annuler</Link>
          <SubmitButton pending={pending} pendingLabel="Connexion…">Se connecter</SubmitButton>
        </div>
      </form>
      <p className={styles.switch}>Pas encore de compte ? <Link href="/inscription">S’inscrire</Link></p>
    </AuthShell>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialAuthFormState);
  const formRef = useFocusFirstError(state);
  const [maxBirthDate, setMaxBirthDate] = useState<string>();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMaxBirthDate(calculateMaximumBirthDate());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <AuthShell title="S’inscrire">
      <form ref={formRef} action={action} className={styles.form} aria-busy={pending} noValidate>
        <div className={styles.formFields}>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="username">Pseudo</label>
              <HelpInfo id="username-help">3 à 40 caractères : lettres, chiffres, point, tiret ou underscore.</HelpInfo>
            </div>
            <input id="username" name="username" autoComplete="username" placeholder="Ex. anim_elo" minLength={3} maxLength={40} aria-invalid={Boolean(state.errors?.username)} aria-describedby={`username-help${state.errors?.username ? " username-error" : ""}`} required />
          <FieldError state={state} name="username" />
          </div>
          <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="birthDate">Date de naissance</label>
            <HelpInfo id="birthDate-help">Tu dois avoir au moins 16 ans. Cette date restera privée.</HelpInfo>
          </div>
          <input id="birthDate" name="birthDate" type="date" min="1900-01-01" max={maxBirthDate} autoComplete="bday" aria-invalid={Boolean(state.errors?.birthDate)} aria-describedby={`birthDate-help${state.errors?.birthDate ? " birthDate-error" : ""}`} required />
          <FieldError state={state} name="birthDate" />
          </div>
          <div className={styles.field}>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="prenom@exemple.fr" aria-invalid={Boolean(state.errors?.email)} aria-describedby={state.errors?.email ? "email-error" : undefined} required />
          <FieldError state={state} name="email" />
          </div>
          <PasswordField id="password" label="Mot de passe" autoComplete="new-password" state={state} help="Au moins 8 caractères, dont une lettre et un chiffre." />
          <PasswordField id="passwordConfirmation" label="Répéter le mot de passe" autoComplete="new-password" state={state} />
          <div aria-live="polite">{state.message && <Notice state={state} />}</div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href="/">Annuler</Link>
          <SubmitButton pending={pending} pendingLabel="Création…">S’inscrire</SubmitButton>
        </div>
      </form>
      <p className={styles.switch}>Déjà membre ? <Link href="/connexion">Se connecter</Link></p>
    </AuthShell>
  );
}

function Notice({ state }: { state: AuthFormState }) {
  return <p role={state.status === "error" ? "alert" : "status"} className={`${styles.notice} ${state.status === "error" ? styles.noticeError : styles.noticeSuccess}`}>{state.message}</p>;
}

function AnimixLogo() {
  return <Image className={styles.logo} src={logoImage} alt="Animix" priority sizes="300px" />;
}

function AuthShell({ title, children, compact = false }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <main className={styles.page}>
      <section className={`${styles.phone} ${compact ? styles.compactPhone : ""}`}>
        <header className={styles.brand}>
          <div className={styles.logoCrop}>
            <AnimixLogo />
          </div>
          <span className={styles.headerSeparator} aria-hidden="true" />
          <p>L’animation à portée de main</p>
        </header>
        <section className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          {children}
        </section>
      </section>
    </main>
  );
}
