import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Formulaire d'activite : couverture + 6 photos de 4 Mo maximum (verifie dans les Server Actions).
    serverActions: { bodySizeLimit: "30mb" },
    // Le Proxy met le corps en memoire : sans cette limite il serait tronque a 10 Mo.
    proxyClientMaxBodySize: "30mb",
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
