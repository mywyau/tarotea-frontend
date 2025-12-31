// https://nuxt.com/docs/api/configuration/nuxt-config
// export default defineNuxtConfig({
//   compatibilityDate: '2025-07-15',
//   devtools: { enabled: true },
//   modules: ['@nuxt/fonts', '@nuxt/image', '@nuxtjs/tailwindcss']
// })

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/fonts", "@nuxt/image", "@nuxtjs/tailwindcss"],

  nitro: {
    preset: "vercel",
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
