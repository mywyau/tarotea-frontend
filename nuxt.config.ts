// // https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss"],

  // image: false, // ⛔ force-disable Nuxt Image

  nitro: {
    preset: "vercel",
    routeRules: {
      // HTML pages
      "/**": {
        headers: {
          "Cache-Control": "no-cache",
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
      ],
    },
  },
});
