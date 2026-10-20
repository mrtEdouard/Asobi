import type { Metadata } from "next";
import ApiExplorer from "./explorer";

export const metadata: Metadata = {
  title: "Asobi · Explorateur API",
  description: "Tester les données et les permissions du compte connecté.",
  robots: { index: false, follow: false },
};

export default function ApiDocumentationPage() {
  return <ApiExplorer />;
}
