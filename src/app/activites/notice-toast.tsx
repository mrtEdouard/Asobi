"use client";

import { useEffect, useState } from "react";
import { getNotice } from "./notices";
import styles from "./activities.module.css";

const DISPLAY_MS = 4000;

/** Notification flottante. A rendre avec key={n} pour reafficher un meme message. */
export function NoticeToast({ code }: { code?: string }) {
  const notice = getNotice(code);
  const [visible, setVisible] = useState(Boolean(notice));

  useEffect(() => {
    if (!notice) return;
    // Retire le message de l'URL : un rafraichissement ne le reaffiche pas.
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.searchParams.delete("n");
    window.history.replaceState(window.history.state, "", url);

    const timer = window.setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice || !visible) return null;

  return (
    <div
      className={`${styles.toast} ${notice.tone === "error" ? styles.toastError : ""}`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true">{notice.tone === "error" ? "!" : "✓"}</span>
      <p>{notice.message}</p>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fermer la notification">×</button>
    </div>
  );
}
