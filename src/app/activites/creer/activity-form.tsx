"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
  const [selected, setSelected] = useState<string[]>([]);
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [customError, setCustomError] = useState<string>();
  const allOptions = [...options, ...customOptions];

  function toggleOption(option: string) {
    setCustomError(undefined);
    if (selected.includes(option)) {
      setSelected((current) => current.filter((item) => item !== option));
      return;
    }
    if (selected.length >= 20) {
      setCustomError("Tu peux sélectionner jusqu’à 20 mots.");
      return;
    }
    setSelected((current) => [...current, option]);
  }

  function addCustomOption() {
    const value = customValue.trim().replace(/\s+/g, " ");
    if (!value) {
      setCustomError("Écris un mot avant de l’ajouter.");
      return;
    }
    if (value.length > 100) {
      setCustomError("Le mot doit contenir 100 caractères maximum.");
      return;
    }

    const existing = allOptions.find((option) => option.localeCompare(value, "fr", { sensitivity: "base" }) === 0);
    if (existing) {
      setSelected((current) => current.includes(existing) ? current : [...current, existing]);
      setCustomValue("");
      setCustomError(undefined);
      return;
    }
    if (selected.length >= 20) {
      setCustomError("Tu peux sélectionner jusqu’à 20 mots.");
      return;
    }

    setCustomOptions((current) => [...current, value]);
    setSelected((current) => [...current, value]);
    setCustomValue("");
    setCustomError(undefined);
  }

  return (
    <fieldset className={styles.bubblePicker}>
      <legend>{legend}</legend>
      <p>{hint}</p>
      <div className={styles.bubbleCloud}>
        {allOptions.map((option) => (
          <label key={option} className={styles.bubbleChoice}>
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={selected.includes(option)}
              onChange={() => toggleOption(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <div className={styles.addBubble}>
        <input
          value={customValue}
          onChange={(event) => {
            setCustomValue(event.target.value);
            setCustomError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomOption();
            }
          }}
          maxLength={100}
          placeholder={name === "objectives" ? "Ajouter un objectif" : "Ajouter du matériel"}
          aria-label={name === "objectives" ? "Nouvel objectif pédagogique" : "Nouveau matériel"}
          aria-describedby={`${name}-custom-help`}
        />
        <button type="button" onClick={addCustomOption} aria-label="Ajouter ce mot">+</button>
      </div>
      <small id={`${name}-custom-help`} className={styles.pickerHelp}>Facultatif · 20 choix maximum · 100 caractères par mot</small>
      {customError && <p role="alert" className={styles.fieldError}>{customError}</p>}
      <ErrorMessage state={state} name={name} />
    </fieldset>
  );
}

export function ActivityForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createActivityAction, initialState);

  return (
    <form action={action} className={styles.form} aria-busy={pending} noValidate>
      <label className={styles.field}>Titre<input name="title" maxLength={180} placeholder="Ex. La fresque des émotions" required /><small>Obligatoire · entre 3 et 180 caractères</small><ErrorMessage state={state} name="title" /></label>
      <label className={styles.field}>Description<textarea name="description" rows={4} maxLength={1500} placeholder="Résume le principe de l’activité et ce que les participants vont faire." required /><small>Obligatoire · entre 10 et 1 500 caractères</small><ErrorMessage state={state} name="description" /></label>
      <label className={styles.field}>Catégorie<select name="categoryId" defaultValue="" required><option value="" disabled>Choisir une catégorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><small>Obligatoire · choisis la catégorie qui décrit le mieux l’activité</small><ErrorMessage state={state} name="categoryId" /></label>

      <fieldset className={styles.group}><legend>Tranche d’âge</legend><p className={styles.groupHint}>Obligatoire · indique l’âge du public, entre 0 et 99 ans</p><div className={styles.twoColumns}>
        <label>Minimum<input name="ageMin" type="number" min="0" max="99" inputMode="numeric" placeholder="6" required /><ErrorMessage state={state} name="ageMin" /></label>
        <label>Maximum<input name="ageMax" type="number" min="0" max="99" inputMode="numeric" placeholder="10" required /><ErrorMessage state={state} name="ageMax" /></label>
      </div></fieldset>

      <fieldset className={styles.group}><legend>Nombre de participants</legend><p className={styles.groupHint}>Obligatoire · indique l’effectif conseillé, entre 1 et 999</p><div className={styles.twoColumns}>
        <label>Minimum<input name="participantsMin" type="number" min="1" max="999" inputMode="numeric" placeholder="6" required /><ErrorMessage state={state} name="participantsMin" /></label>
        <label>Maximum<input name="participantsMax" type="number" min="1" max="999" inputMode="numeric" placeholder="16" required /><ErrorMessage state={state} name="participantsMax" /></label>
      </div></fieldset>

      <div className={styles.twoColumns}>
        <label className={styles.field}>Durée estimée<input name="durationMinutes" type="number" min="5" max="1440" inputMode="numeric" placeholder="45 min" required /><small>Obligatoire · en minutes, de 5 à 1 440</small><ErrorMessage state={state} name="durationMinutes" /></label>
        <label className={styles.field}>Environnement<select name="environment" defaultValue="both"><option value="indoor">Intérieur</option><option value="outdoor">Extérieur</option><option value="both">Les deux</option></select><small>Obligatoire · lieu adapté à l’activité</small></label>
      </div>

      <BubblePicker
        legend="Objectifs pédagogiques"
        hint="Touche les objectifs travaillés par l’activité ou ajoute les tiens."
        name="objectives"
        options={pedagogicalObjectives}
        state={state}
      />
      <BubblePicker
        legend="Matériel"
        hint="Sélectionne tout ce qu’il faut prévoir ou ajoute tes propres mots."
        name="equipment"
        options={equipmentItems}
        state={state}
      />
      <label className={styles.field}>Préparation et déroulement<textarea name="preparation" rows={8} maxLength={5000} placeholder="Explique les préparatifs, les règles puis les étapes dans l’ordre." required /><small>Obligatoire · entre 10 et 5 000 caractères</small><ErrorMessage state={state} name="preparation" /></label>
      <label className={styles.field}>Sécurité et points de vigilance<textarea name="safety" rows={4} maxLength={3000} placeholder="Précise les risques, les règles de sécurité et les adaptations nécessaires." required /><small>Obligatoire · entre 5 et 3 000 caractères</small><ErrorMessage state={state} name="safety" /></label>

      <fieldset className={styles.visibility}><legend>Qui peut voir cette activité&nbsp;?</legend>
        <p className={styles.visibilityHint}>Obligatoire · tu pourras modifier ce choix plus tard</p>
        <label><input type="radio" name="visibility" value="private" defaultChecked /><span><strong>Privée</strong><small>Uniquement dans ma galerie</small></span></label>
        <label><input type="radio" name="visibility" value="public" /><span><strong>Publique</strong><small>Visible par la communauté</small></span></label>
      </fieldset>

      {state.message && <p role="alert" className={styles.formError}>{state.message}</p>}
      <div className={styles.formActions}><Link href="/activites">Annuler</Link><button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Créer l’activité"}</button></div>
    </form>
  );
}
