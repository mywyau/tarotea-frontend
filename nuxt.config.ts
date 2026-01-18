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
    },
  },

  app: {
    head: {
      title: "TaroTea — Learn Spoken Cantonese",
      meta: [
        {
          name: "description",
          content:
            "Learn natural, spoken Cantonese with practical modules and topics.",
        },
      ],
    },
  },
});

console.log("BUILD-TIME CDN ENV:", process.env.NUXT_PUBLIC_CDN_BASE);
