"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createActivityAction, updateActivityAction, type ActivityActionState } from "../actions";
import styles from "../activities.module.css";

type Category = { id: string; name: string };
export type ActivityFormValues = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  ageMin: number;
  ageMax: number;
  participantsMin: number;
  participantsMax: number;
  durationMinutes: number;
  environment: "indoor" | "outdoor" | "both";
  objectives: string[];
  equipment: string[];
  preparation: string;
  safety: string;
  visibility: "private" | "public";
};
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

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 0, width: 240 });

  return (
    <span className={styles.infoTip}>
      <button
        type="button"
        aria-label="Afficher l’aide"
        aria-expanded={open}
        onClick={(event) => {
          if (!open) {
            const rect = event.currentTarget.getBoundingClientRect();
            const width = Math.min(240, window.innerWidth - 24);
            const top = rect.bottom + 107 <= window.innerHeight
              ? rect.bottom + 7
              : Math.max(12, rect.top - 100);
            setPosition({
              left: Math.min(Math.max(rect.left - 8, 12), window.innerWidth - width - 12),
              top,
              width,
            });
          }
          setOpen((current) => !current);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        i
      </button>
      {open && <span role="status" className={styles.infoPopover} style={position}>{text}</span>}
    </span>
  );
}

function FieldHeading({ htmlFor, children, help }: { htmlFor: string; children: string; help: string }) {
  return (
    <span className={styles.fieldHeading}>
      <label htmlFor={htmlFor}>{children}</label>
      <InfoTip text={help} />
    </span>
  );
}

function BubblePicker({
  legend,
  hint,
  name,
  options,
  initialSelected = [],
  state,
}: {
  legend: string;
  hint: string;
  name: "objectives" | "equipment";
  options: string[];
  initialSelected?: string[];
  state: ActivityActionState;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [customOptions, setCustomOptions] = useState<string[]>(
    initialSelected.filter((value) => !options.some((option) => option.localeCompare(value, "fr", { sensitivity: "base" }) === 0)),
  );
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
      <legend><span>{legend}</span><InfoTip text={`${hint} Facultatif, 20 choix maximum et 100 caractères par mot.`} /></legend>
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
        />
        <button type="button" onClick={addCustomOption} aria-label="Ajouter ce mot">+</button>
      </div>
      {customError && <p role="alert" className={styles.fieldError}>{customError}</p>}
      <ErrorMessage state={state} name={name} />
    </fieldset>
  );
}

export function ActivityForm({ categories, activity }: { categories: Category[]; activity?: ActivityFormValues }) {
  const [state, action, pending] = useActionState(activity ? updateActivityAction : createActivityAction, initialState);

  return (
    <form action={action} className={styles.form} aria-busy={pending} noValidate>
      {activity && <input type="hidden" name="activityId" value={activity.id} />}
      <div className={styles.field}><FieldHeading htmlFor="title" help="Obligatoire. Entre 3 et 180 caractères.">Titre</FieldHeading><input id="title" name="title" maxLength={180} placeholder="Ex. La fresque des émotions" defaultValue={activity?.title} required /><ErrorMessage state={state} name="title" /></div>
      <div className={styles.field}><FieldHeading htmlFor="description" help="Obligatoire. Résume le principe de l’activité en 10 à 1 500 caractères.">Description</FieldHeading><textarea id="description" name="description" rows={4} maxLength={1500} placeholder="Résume le principe de l’activité et ce que les participants vont faire." defaultValue={activity?.description} required /><ErrorMessage state={state} name="description" /></div>
      <div className={styles.field}><FieldHeading htmlFor="categoryId" help="Obligatoire. Choisis la catégorie qui décrit le mieux l’activité.">Catégorie</FieldHeading><select id="categoryId" name="categoryId" defaultValue={activity?.categoryId ?? ""} required><option value="" disabled>Choisir une catégorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ErrorMessage state={state} name="categoryId" /></div>

      <fieldset className={styles.group}><legend><span>Tranche d’âge</span><InfoTip text="Obligatoire. Indique l’âge minimum et maximum du public, entre 0 et 99 ans." /></legend><div className={styles.twoColumns}>
        <label>Minimum<input name="ageMin" type="number" min="0" max="99" inputMode="numeric" defaultValue={activity?.ageMin} required /><ErrorMessage state={state} name="ageMin" /></label>
        <label>Maximum<input name="ageMax" type="number" min="0" max="99" inputMode="numeric" defaultValue={activity?.ageMax} required /><ErrorMessage state={state} name="ageMax" /></label>
      </div></fieldset>

      <fieldset className={styles.group}><legend><span>Nombre de participants</span><InfoTip text="Obligatoire. Indique l’effectif minimum et maximum conseillé, entre 1 et 999 personnes." /></legend><div className={styles.twoColumns}>
        <label>Minimum<input name="participantsMin" type="number" min="1" max="999" inputMode="numeric" defaultValue={activity?.participantsMin} required /><ErrorMessage state={state} name="participantsMin" /></label>
        <label>Maximum<input name="participantsMax" type="number" min="1" max="999" inputMode="numeric" defaultValue={activity?.participantsMax} required /><ErrorMessage state={state} name="participantsMax" /></label>
      </div></fieldset>

      <div className={styles.twoColumns}>
        <div className={styles.field}><FieldHeading htmlFor="durationMinutes" help="Obligatoire. Saisis la durée en minutes, de 5 à 1 440.">Durée estimée</FieldHeading><input id="durationMinutes" name="durationMinutes" type="number" min="5" max="1440" inputMode="numeric" placeholder="45 min" defaultValue={activity?.durationMinutes} required /><ErrorMessage state={state} name="durationMinutes" /></div>
        <div className={styles.field}><FieldHeading htmlFor="environment" help="Obligatoire. Indique si l’activité se déroule en intérieur, en extérieur ou dans les deux.">Environnement</FieldHeading><select id="environment" name="environment" defaultValue={activity?.environment ?? "both"}><option value="indoor">Intérieur</option><option value="outdoor">Extérieur</option><option value="both">Les deux</option></select></div>
      </div>

      <BubblePicker
        legend="Objectifs pédagogiques"
        hint="Touche les objectifs travaillés par l’activité ou ajoute les tiens."
        name="objectives"
        options={pedagogicalObjectives}
        initialSelected={activity?.objectives}
        state={state}
      />
      <BubblePicker
        legend="Matériel"
        hint="Sélectionne tout ce qu’il faut prévoir ou ajoute tes propres mots."
        name="equipment"
        options={equipmentItems}
        initialSelected={activity?.equipment}
        state={state}
      />
      <div className={styles.field}><FieldHeading htmlFor="preparation" help="Obligatoire. Décris les préparatifs, les règles et les étapes dans l’ordre, en 10 à 5 000 caractères.">Préparation et déroulement</FieldHeading><textarea id="preparation" name="preparation" rows={8} maxLength={5000} placeholder="Explique les préparatifs, les règles puis les étapes dans l’ordre." defaultValue={activity?.preparation} required /><ErrorMessage state={state} name="preparation" /></div>
      <div className={styles.field}><FieldHeading htmlFor="safety" help="Obligatoire. Précise les risques, les règles de sécurité et les adaptations nécessaires, en 5 à 3 000 caractères.">Sécurité et points de vigilance</FieldHeading><textarea id="safety" name="safety" rows={4} maxLength={3000} placeholder="Précise les risques, les règles de sécurité et les adaptations nécessaires." defaultValue={activity?.safety} required /><ErrorMessage state={state} name="safety" /></div>

      <fieldset className={styles.visibility}><legend><span>Qui peut voir cette activité&nbsp;?</span><InfoTip text="Obligatoire. Choisis privée ou publique ; tu pourras modifier ce choix plus tard." /></legend>
        <label><input type="radio" name="visibility" value="private" defaultChecked={!activity || activity.visibility === "private"} /><span><strong>Privée</strong><small>Uniquement dans ma galerie</small></span></label>
        <label><input type="radio" name="visibility" value="public" defaultChecked={activity?.visibility === "public"} /><span><strong>Publique</strong><small>Visible par la communauté</small></span></label>
      </fieldset>

      {state.message && <p role="alert" className={styles.formError}>{state.message}</p>}
      <div className={styles.formActions}><Link href={activity ? `/activites/${activity.id}` : "/activites"}>Annuler</Link><button type="submit" disabled={pending}>{pending ? "Enregistrement…" : activity ? "Enregistrer" : "Créer l’activité"}</button></div>
    </form>
  );
}
