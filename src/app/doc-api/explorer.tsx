"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import catalog from "./catalog.json";
import styles from "./explorer.module.css";

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type ApiResult = { status: number | string; duration: number; data: unknown; range?: string | null; url?: string; method?: string };
type Filter = { column: string; operator: string; value: string };
const emptyFilter: Filter = { column: "id", operator: "eq", value: "" };
const operators = ["eq", "neq", "gt", "gte", "lt", "lte", "ilike", "is", "in"];
const ownerColumns: Record<string, string> = {
  users: "id", activities: "author_id", favorites: "user_id", comments: "author_id",
  comment_replies: "author_id", offers: "recruiter_id", activity_shares: "recipient_id",
  notifications: "recipient_id", messages: "sender_id", blocks: "blocker_id",
  reports: "reporter_id", user_roles: "user_id", activity_reviews: "reviewer_id",
};

function makePayload(table: string) {
  if (table === "categories") return { name: "Catégorie de test" };
  if (table === "activities") return { title: "Mon activité de test", description: "Une première fiche", visibility: "private", status: "draft" };
  if (table === "offers") return { title: "Séjour de test", status: "draft" };
  return {};
}

export default function ApiExplorer() {
  const [supabase] = useState(() => createClient());
  const sessionRevision = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [table, setTable] = useState("categories");
  const [method, setMethod] = useState<Method>("GET");
  const [filters, setFilters] = useState<Filter[]>([{ ...emptyFilter }]);
  const [columns, setColumns] = useState("*");
  const [order, setOrder] = useState("");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [body, setBody] = useState(JSON.stringify(makePayload("categories"), null, 2));
  const [result, setResult] = useState<ApiResult | null>(null);
  const [history, setHistory] = useState<{ method: string; table: string; status: string; time: string }[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [schemaMessage, setSchemaMessage] = useState("Schéma non inspecté");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [tab, setTab] = useState<"json" | "rows">("json");
  const definition = catalog.find((item) => item.name === table);
  const fields = definition?.fields ?? [];
  const [confirmation, setConfirmation] = useState("");
  const [discoveredFields, setDiscoveredFields] = useState<Record<string, string[]>>({});
  const fieldNames = [...new Set([...fields.map(f => f.name), ...(discoveredFields[table] ?? [])])];
  const allTables = [...new Set([...catalog.map(item => item.name), ...available])];

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) setUser(data.user); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRevision.current += 1;
      setUser(session?.user ?? null);
      // Ne pas conserver la reponse privee du compte precedent dans interface.
      setResult(null);
      setHistory([]);
      setAvailable([]);
      setSchemaMessage("Réinspecter le schéma pour ce compte");
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  async function requestHeaders(): Promise<Record<string, string>> {
    const { key } = getSupabaseConfig();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return {
      apikey: key,
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      "Content-Type": "application/json",
    };
  }

  async function inspectSchema() {
    setBusy(true);
    try {
      const { url } = getSupabaseConfig();
      const response = await fetch(`${url}/rest/v1/`, { headers: { ...await requestHeaders(), Accept: "application/openapi+json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        // Certains projets reservent OpenAPI aux cles secretes : ne jamais en
        // demander une au navigateur. Sonder les tables connues sans lire de lignes.
        const headers = await requestHeaders();
        const probes = await Promise.all(catalog.map(async ({ name }) => {
          const probe = await fetch(`${url}/rest/v1/${name}?select=*&limit=0`, { headers, cache: "no-store" });
          const result = await probe.json();
          return probe.ok || result.code === "42501" ? name : null;
        }));
        const names = probes.filter((name): name is string => name !== null);
        setAvailable(names);
        setSchemaMessage(`${names.length} table(s) détectée(s) parmi le modèle. Les droits varient selon la session ; aucune clé secrète utilisée.`);
        return;
      }
      const names = Object.keys(data.paths ?? {}).filter(path => /^\/[a-zA-Z_][a-zA-Z0-9_]*$/.test(path)).map(path => path.slice(1));
      setAvailable(names);
      const schemas = data.definitions ?? data.components?.schemas ?? {};
      setDiscoveredFields(Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, Object.keys((schema as { properties?: object }).properties ?? {})])));
      setSchemaMessage(`${names.length} table(s) exposée(s) à ce rôle. Les autres sont prévues, absentes ou non exposées.`);
    } catch (error) { setSchemaMessage(error instanceof Error ? error.message : "Inspection impossible"); }
    finally { setBusy(false); }
  }

  function chooseTable(name: string) {
    setTable(name); setFilters([{ ...emptyFilter }]); setResult(null);
    setBody(JSON.stringify(makePayload(name), null, 2)); setConfirmation(""); setOrder(""); setColumns("*"); setOffset(0);
  }

  function buildQuery() {
    const query = new URLSearchParams();
    query.set("select", columns.trim() || "*");
    for (const filter of filters) {
      if (filter.column && filter.value !== "") query.append(filter.column, `${filter.operator}.${filter.value}`);
    }
    if (method === "GET") {
      query.set("limit", String(Math.min(100, Math.max(1, limit || 25))));
      query.set("offset", String(Math.max(0, offset || 0)));
      if (order.trim()) query.set("order", order.trim());
    }
    return query;
  }

  async function execute() {
    setBusy(true);
    const started = performance.now();
    const revision = sessionRevision.current;
    try {
      const changing = method === "PATCH" || method === "DELETE";
      if (changing && !filters.some(f => f.column && f.value !== "" && f.operator === "eq")) {
        throw new Error("Modification/suppression : ajoute au moins un filtre d’égalité non vide. Pour une seule ligne, utilise sa clé primaire complète.");
      }
      if (method === "DELETE" && confirmation !== table) throw new Error(`Pour confirmer la suppression, saisis ${table}.`);
      let payload: unknown;
      if (method === "POST" || method === "PATCH") {
        payload = JSON.parse(body);
        if (!payload || Array.isArray(payload) || typeof payload !== "object" || !Object.keys(payload).length) throw new Error("Le corps doit être un objet JSON non vide (une ligne à la fois).");
        if (method === "POST" && user && ownerColumns[table] && !Object.hasOwn(payload, ownerColumns[table])) {
          // Remplissage explicite via bouton prefere ; pas de mutation silencieuse ici.
          throw new Error(`Ajoute ${ownerColumns[table]} au JSON, ou utilise « Ajouter mon identifiant ».`);
        }
      }
      const { url } = getSupabaseConfig();
      const target = `${url}/rest/v1/${encodeURIComponent(table)}?${buildQuery()}`;
      const response = await fetch(target, {
        method,
        headers: { ...await requestHeaders(), Prefer: method === "GET" ? "count=exact" : (changing ? "return=representation,handling=strict,max-affected=1" : "return=representation") },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        cache: "no-store",
      });
      const text = await response.text();
      let data: unknown = text;
      try { data = text ? JSON.parse(text) : null; } catch { /* Reponse brute si non JSON. */ }
      if (revision !== sessionRevision.current) return;
      setResult({ status: response.status, duration: Math.round(performance.now() - started), data, range: response.headers.get("content-range"), url: target, method });
      setHistory(h => [{ method, table, status: String(response.status), time: new Date().toLocaleTimeString("fr-FR") }, ...h].slice(0, 12));
      setConfirmation("");
    } catch (error) {
      if (revision !== sessionRevision.current) return;
      setResult({ status: "Erreur locale", duration: Math.round(performance.now() - started), data: { message: error instanceof Error ? error.message : "Requête impossible" } });
    } finally { setBusy(false); }
  }

  async function authenticate(action: "login" | "signup" | "logout") {
    setAuthBusy(true); setAuthMessage("");
    try {
      if (action === "logout") {
        const { error } = await supabase.auth.signOut(); if (error) throw error;
        setAuthMessage("Déconnexion réussie.");
      } else {
        if (!email || !password) throw new Error("Renseigne email et mot de passe.");
        const { data, error } = action === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setUser(data.user);
        setAuthMessage(action === "signup" && !data.session ? "Compte Auth créé : confirme ton email avant de te connecter. Le profil métier sera ajouté ultérieurement." : "Connexion réussie.");
      }
      setPassword("");
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : "Authentification impossible"); }
    finally { setAuthBusy(false); }
  }

  function ownRows() {
    if (!user) return;
    const column = ownerColumns[table];
    if (column) setFilters([{ column, operator: "eq", value: user.id }]);
    else if (["friendships", "direct_conversations"].includes(table)) {
      setResult({ status: "Information", duration: 0, data: { message: "Les participants sont dans user_low_id et user_high_id. Filtre une colonne à la fois ou utilise les filtres avancés dans une prochaine version." } });
    }
    setMethod("GET"); setOffset(0);
  }

  function addOwner() {
    if (!user || !ownerColumns[table]) return;
    try { setBody(JSON.stringify({ ...JSON.parse(body), [ownerColumns[table]]: user.id }, null, 2)); }
    catch { setResult({ status: "Erreur locale", duration: 0, data: { message: "Corrige le JSON avant d’ajouter ton identifiant." } }); }
  }

  const rows = Array.isArray(result?.data) ? result.data as Record<string, unknown>[] : [];
  const rowColumns = [...new Set(rows.flatMap(row => Object.keys(row)))];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>animix<span>API LAB</span></Link>
        <p className={styles.caption}>EXPLORATEUR DE DONNÉES</p>
        <input aria-label="Rechercher une table" placeholder="Rechercher une table…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className={styles.secondary} disabled={busy} onClick={inspectSchema}>↻ Inspecter la base</button>
        <p className={styles.small}>{schemaMessage}</p>
        <nav aria-label="Tables">{allTables.filter(name => name.includes(search.toLowerCase())).map(name => (
          <button key={name} className={table === name ? styles.selected : styles.tableButton} onClick={() => chooseTable(name)}>
            <span>{name}</span><span title={available.includes(name) ? "Exposée au rôle actuel" : "Disponibilité non confirmée"}>{available.includes(name) ? "●" : "○"}</span>
          </button>
        ))}</nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}><div><p className={styles.caption}>DOCUMENTATION INTERACTIVE</p><h1>Le laboratoire d’Animix<span>.</span></h1><p>Explore les tables, construis une requête et inspecte la réponse réelle de Supabase.</p></div><span className={styles.badge}>{user ? "SESSION CONNECTÉE" : "VISITEUR"}</span></header>
        <div className={styles.notice}>Les requêtes touchent la vraie base. Les droits SQL et RLS du compte connecté s’appliquent ; ce panneau ne donne aucun privilège administrateur. Une réponse vide peut signifier qu’aucune ligne n’est visible.</div>

        <section className={styles.card} aria-labelledby="session-title"><div className={styles.sectionHead}><h2 id="session-title">01 · Session utilisateur</h2><span className={styles.small}>Supabase Auth</span></div>
          {user ? <div className={styles.session}><div><strong>{user.email}</strong><code>{user.id}</code></div><button disabled={authBusy} onClick={() => authenticate("logout")}>Se déconnecter</button></div> : <>
            <div className={styles.authGrid}><label>Email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={authBusy} onClick={() => authenticate("login")}>Se connecter</button><button className={styles.secondary} disabled={authBusy} onClick={() => authenticate("signup")}>Créer un compte de test</button></div>
            <p className={styles.small}>Création d’un compte Auth technique uniquement : le parcours métier avec contrôle d’âge et profil n’est pas encore implémenté.</p>
          </>}{authMessage && <p role="status" className={styles.feedback}>{authMessage}</p>}
        </section>

        <section className={styles.card} aria-labelledby="request-title"><div className={styles.sectionHead}><h2 id="request-title">02 · Construire une requête</h2><code>public.{table}</code></div>
          <div className={styles.methods}>{(["GET", "POST", "PATCH", "DELETE"] as Method[]).map(m => <button key={m} aria-pressed={method === m} className={method === m ? styles.activeMethod : styles.secondary} onClick={() => { setMethod(m); setConfirmation(""); }}>{m} <span>{{ GET: "Lire", POST: "Créer", PATCH: "Modifier", DELETE: "Supprimer" }[m]}</span></button>)}</div>
          <div className={styles.toolbar}><button className={styles.secondary} onClick={() => { setMethod("GET"); setFilters([{ ...emptyFilter }]); setOffset(0); }}>Toutes les lignes accessibles</button><button className={styles.secondary} disabled={!user || !ownerColumns[table]} onClick={ownRows}>Mes lignes</button><button className={styles.secondary} disabled={!user} onClick={() => { chooseTable("activities"); setMethod("GET"); if (user) setFilters([{ column: "author_id", operator: "eq", value: user.id }]); }}>Mes activités</button></div>
          <label>Colonnes retournées<input value={columns} onChange={e => setColumns(e.target.value)} placeholder="* ou id,title" /></label>
          <div className={styles.filterTitle}><h3>Filtres <span>combinés avec ET</span></h3><button className={styles.textButton} onClick={() => setFilters(f => [...f, { ...emptyFilter }])}>+ Ajouter</button></div>
          <datalist id="field-names">{fieldNames.map(name => <option key={name} value={name} />)}</datalist>
          {filters.map((filter, index) => <div className={styles.filterRow} key={index}><input aria-label={`Colonne filtre ${index + 1}`} list="field-names" value={filter.column} onChange={e => setFilters(f => f.map((v, i) => i === index ? { ...v, column: e.target.value } : v))} /><select aria-label={`Opérateur filtre ${index + 1}`} value={filter.operator} onChange={e => setFilters(f => f.map((v, i) => i === index ? { ...v, operator: e.target.value } : v))}>{operators.map(op => <option key={op}>{op}</option>)}</select><input aria-label={`Valeur filtre ${index + 1}`} placeholder="UUID, texte, null, (a,b)…" value={filter.value} onChange={e => setFilters(f => f.map((v, i) => i === index ? { ...v, value: e.target.value } : v))} /><button className={styles.secondary} aria-label={`Retirer filtre ${index + 1}`} onClick={() => setFilters(f => f.filter((_, i) => i !== index))}>×</button></div>)}
          {method === "GET" && <div className={styles.pagination}><label>Limite (1–100)<input type="number" min="1" max="100" value={limit} onChange={e => setLimit(Number(e.target.value))} /></label><label>Décalage<input type="number" min="0" value={offset} onChange={e => setOffset(Number(e.target.value))} /></label><label>Tri<input placeholder="created_at.desc ou name.asc" value={order} onChange={e => setOrder(e.target.value)} /></label></div>}
          {(method === "POST" || method === "PATCH") && <><div className={styles.filterTitle}><h3>Corps JSON</h3><button className={styles.textButton} disabled={method !== "POST" || !user || !ownerColumns[table]} onClick={addOwner}>Ajouter mon identifiant</button></div><textarea aria-label="Corps JSON" spellCheck={false} rows={9} value={body} onChange={e => setBody(e.target.value)} /><p className={styles.small}>PATCH : uniquement les champs à modifier. Tables d’association : utiliser tous les champs de la clé composée dans les filtres. Aucun champ protégé n’est modifiable si les permissions sont correctement configurées.</p></>}
          {method === "DELETE" && <label className={styles.deleteNotice}>Suppression réelle des lignes correspondant aux filtres. Saisis « {table} » pour confirmer.<input aria-label="Confirmation suppression" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>}
          <div className={styles.requestPreview}><span className={styles.verb}>{method}</span><code>/rest/v1/{table}?{buildQuery().toString()}</code></div>
          <button className={method === "DELETE" ? styles.danger : styles.execute} disabled={busy || (method === "DELETE" && confirmation !== table)} onClick={execute}>{busy ? "Requête en cours…" : "Exécuter la requête →"}</button>
          <p className={styles.small}>Ce panneau interroge directement la Data API Supabase. Il ne représente pas encore une API métier Next.js. GET renvoie au maximum 100 lignes par page ; PATCH et DELETE sont limités à une ligne par requête ; des filtres trop larges provoquent une erreur.</p>
        </section>

        <section className={styles.card} aria-labelledby="response-title"><div className={styles.sectionHead}><h2 id="response-title">03 · Réponse</h2>{result && <span className={styles.badge}>{result.status} · {result.duration} ms</span>}</div>
          <div className={styles.toolbar}><button className={tab === "json" ? styles.activeMethod : styles.secondary} onClick={() => setTab("json")}>JSON</button><button className={tab === "rows" ? styles.activeMethod : styles.secondary} onClick={() => setTab("rows")}>Tableau</button><button className={styles.secondary} disabled={!result} onClick={() => { setResult(null); setHistory([]); }}>Effacer</button></div>
          {result?.range && <p className={styles.small}>Content-Range : {result.range}</p>}
          {!result ? <p className={styles.empty}>La réponse apparaîtra ici après la première requête.</p> : tab === "json" ? <pre className={styles.json}>{JSON.stringify(result.data, null, 2)}</pre> : rows.length ? <div className={styles.scroll}><table><thead><tr><th>Utiliser</th>{rowColumns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}><td><button className={styles.secondary} onClick={() => { const keys = row.id ? ["id"] : fieldNames.filter(k => k.endsWith("_id") && row[k] != null); setFilters(keys.map(k => ({ column: k, operator: "eq", value: String(row[k]) }))); setBody(JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k]) => !["id", "created_at", "updated_at", ...(table === "activities" ? ["author_id", "status", "published_at", "deleted_at"] : [])].includes(k))), null, 2)); }}>Charger</button></td>{rowColumns.map(c => <td key={c}>{typeof row[c] === "object" ? JSON.stringify(row[c]) : String(row[c] ?? "null")}</td>)}</tr>)}</tbody></table></div> : <p className={styles.empty}>Pas de lignes à afficher. Consulte la réponse JSON.</p>}
          <p className={styles.small}>404 / PGRST205 : table absente ou non exposée · 401/403 : authentification ou permissions · 409 : conflit de contrainte · [] : aucune ligne visible ou correspondante.</p>
        </section>
        <section className={styles.card}><h2>Champs du modèle · {table}</h2><p className={styles.small}>Documentation issue du DBML, pas une preuve que la table existe. Les champs réels sont aussi proposés après inspection.</p><div className={styles.scroll}><table><thead><tr><th>Champ</th><th>Type</th><th>Explication</th></tr></thead><tbody>{fields.map(f => <tr key={f.name}><td><code>{f.name}</code>{f.required && <span title="Obligatoire en base"> *</span>}</td><td><code>{f.type}</code></td><td>{f.note}</td></tr>)}</tbody></table></div></section>
        {history.length > 0 && <section className={styles.card}><h2>Dernières requêtes · cette session</h2>{history.map((item, i) => <p key={i} className={styles.history}><code>{item.method} {item.table}</code><span>{item.status} · {item.time}</span></p>)}</section>}
      </main>
    </div>
  );
}
