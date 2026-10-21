"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createActivityAction, type ActivityActionState } from "../actions";
import styles from "../activities.module.css";

type Category = { id: string; name: string };
const initialState: ActivityActionState = { status: "idle" };

const pedagogicalObjectives = [
  "Coopération",
  "Autonomie",
  "Créativité",
  "Communication",
  "Motricité",
  "Confiance en soi",
  "Expression",
  "Concentration",
  "Découverte",
  "Respect",
  "Imagination",
  "Esprit d’équipe",
];

const equipmentItems = [
  "Sans matériel",
  "Ballon",
  "Corde",
  "Plots",
  "Cercles",
  "Feuilles",
  "Carton",
  "Crayons",
  "Feutres",
  "Peinture",
  "Ciseaux",
  "Colle",
  "Musique",
  "Dés",
  "Cartes",
  "Chronomètre",
];

function ErrorMessage({ state, name }: { state: ActivityActionState; name: string }) {
  const message = state.errors?.[name]?.[0];
  return message ? <p className={styles.fieldError}>{message}</p> : null;
}

function BubblePicker({
  legend,
  hint,
  name,
  options,
  state,
}: {
  legend: string;
  hint: string;
  name: "objectives" | "equipment";
  options: string[];
  state: ActivityActionState;
}) {
  return (
    <fieldset className={styles.bubblePicker}>
      <legend>{legend}</legend>
      <p>{hint}</p>
      <div className={styles.bubbleCloud}>
        {options.map((option) => (
          <label key={option} className={styles.bubbleChoice}>
            <input type="checkbox" name={name} value={option} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <ErrorMessage state={state} name={name} />
    </fieldset>
  );
}

export function ActivityForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createActivityAction, initialState);

  return (
    <form action={action} className={styles.form} aria-busy={pending} noValidate>
      <label className={styles.field}>Titre<input name="title" maxLength={180} required /><ErrorMessage state={state} name="title" /></label>
      <label className={styles.field}>Description<textarea name="description" rows={4} maxLength={1500} required /><ErrorMessage state={state} name="description" /></label>
      <label className={styles.field}>Catégorie<select name="categoryId" defaultValue="" required><option value="" disabled>Choisir une catégorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ErrorMessage state={state} name="categoryId" /></label>

      <fieldset className={styles.group}><legend>Tranche d’âge</legend><div className={styles.twoColumns}>
        <label>Minimum<input name="ageMin" type="number" min="0" max="99" inputMode="numeric" required /></label>
        <label>Maximum<input name="ageMax" type="number" min="0" max="99" inputMode="numeric" required /><ErrorMessage state={state} name="ageMax" /></label>
      </div></fieldset>

      <fieldset className={styles.group}><legend>Nombre de participants</legend><div className={styles.twoColumns}>
        <label>Minimum<input name="participantsMin" type="number" min="1" max="999" inputMode="numeric" required /></label>
        <label>Maximum<input name="participantsMax" type="number" min="1" max="999" inputMode="numeric" required /><ErrorMessage state={state} name="participantsMax" /></label>
      </div></fieldset>

      <div className={styles.twoColumns}>
        <label className={styles.field}>Durée estimée<input name="durationMinutes" type="number" min="5" max="1440" inputMode="numeric" placeholder="Minutes" required /><ErrorMessage state={state} name="durationMinutes" /></label>
        <label className={styles.field}>Environnement<select name="environment" defaultValue="both"><option value="indoor">Intérieur</option><option value="outdoor">Extérieur</option><option value="both">Les deux</option></select></label>
      </div>

      <BubblePicker
        legend="Objectifs pédagogiques"
        hint="Touche les objectifs travaillés par l’activité."
        name="objectives"
        options={pedagogicalObjectives}
        state={state}
      />
      <BubblePicker
        legend="Matériel"
        hint="Sélectionne tout ce qu’il faut prévoir."
        name="equipment"
        options={equipmentItems}
        state={state}
      />
      <label className={styles.field}>Préparation et déroulement<textarea name="preparation" rows={8} maxLength={5000} required /><ErrorMessage state={state} name="preparation" /></label>
      <label className={styles.field}>Sécurité et points de vigilance<textarea name="safety" rows={4} maxLength={3000} required /><ErrorMessage state={state} name="safety" /></label>

      <fieldset className={styles.visibility}><legend>Qui peut voir cette activité&nbsp;?</legend>
        <label><input type="radio" name="visibility" value="private" defaultChecked /><span><strong>Privée</strong><small>Uniquement dans ma galerie</small></span></label>
        <label><input type="radio" name="visibility" value="public" /><span><strong>Publique</strong><small>Visible par la communauté</small></span></label>
      </fieldset>

      {state.message && <p role="alert" className={styles.formError}>{state.message}</p>}
      <div className={styles.formActions}><Link href="/activites">Annuler</Link><button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Créer l’activité"}</button></div>
    </form>
  );
}
