// // https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss"],

  // image: false, // ⛔ force-disable Nuxt Image

  nitro: {
    preset: "vercel",
  },

  runtimeConfig: {
    public: {
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
            "Learn natural, spoken Cantonese with exercises, vocabulary, audio and quizzes.",
        },
      ],
    },
  },
});
