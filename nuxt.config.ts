import type { NuxtPage } from "@nuxt/schema";

function usePublicPagePaths(pages: NuxtPage[]) {
  for (const page of pages) {
    const original = page.path;
    const canonical = original.replace(/\/v\d+(?=\/|$)/g, "");
    if (canonical !== original) {
      if (pages.some(other => other !== page && other.path === canonical)) {
        throw new Error(`Two pages map to ${canonical}`);
      }
      page.path = canonical;
      page.alias = [original].concat(page.alias ?? []);
      // The original navigation also linked to this daily practice shortcut.
      if (canonical === "/daily/vocab/start-quiz") page.alias.push("/daily/v3");
    }
    if (page.children) usePublicPagePaths(page.children);
  }
}

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "@nuxt/fonts"],

  hooks: { "pages:extend": usePublicPagePaths },

  components: [{ path: "~/components", pathPrefix: false }],

  css: ["~/assets/css/theme.css", "~/assets/css/product-redesign.css"],

  fonts: {
    provider: "google",
    processCSSVariables: false,
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      preload: false,
    },
    families: [
      {
        name: "Manrope",
        provider: "google",
        weights: [400, 500, 600, 700],
        preload: false,
        global: true,
      },
    ],
  },

  // image: false, // ⛔ force-disable Nuxt Image

  nitro: {
    preset: "vercel",
    routeRules: {
      // HTML pages
      "/**": {
        headers: {
          "Cache-Control": "private, no-cache",
        },
      },

      // Static Nuxt assets (hashed, safe to cache)
      "/_nuxt/**": {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    },
  },

  vite: {
    build: {
      cssCodeSplit: false,
    },
  },

  runtimeConfig: {
    qstashUrl: process.env.QSTASH_URL,
    qstashCurrentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    qstashNextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    qstashToken: process.env.QSTASH_TOKEN,
    public: {
      appVersion: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(),
      cdnBase: process.env.NUXT_PUBLIC_CDN_BASE,
      auth0Domain: process.env.AUTH0_DOMAIN,
      auth0ClientId: process.env.AUTH0_CLIENT_ID,
      auth0Audience: process.env.AUTH0_AUDIENCE,
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      titleTemplate: (titleChunk) => {
        return titleChunk
          ? `${titleChunk} · TaroTea`
          : "TaroTea · Learn Cantonese";
      },
      meta: [
        {
          name: "description",
          content:
            "Learn natural Cantonese with exercises, vocabulary, audio and quizzes.",
        },
        {
          property: "og:site_name",
          content: "TaroTea",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon-32x32.png",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        },
      ],
    },
  },
});
