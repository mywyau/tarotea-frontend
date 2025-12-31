// // https://nuxt.com/docs/api/configuration/nuxt-config
// export default defineNuxtConfig({
//   devtools: { enabled: true },
//   modules: [
//     "@nuxt/fonts",
//     // "@nuxt/image",
//     "@nuxtjs/tailwindcss"
//     ],

//   nitro: {
//     preset: "vercel",
//   },

//   app: {
//     head: {
//       title: "TaroTea — Learn Spoken Cantonese",
//       meta: [
//         {
//           name: "description",
//           content:
//             "Learn natural, spoken Cantonese with practical modules and topics.",
//         },
//       ],
//     },
//   },
// });

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss"],

  // image: false, // ⛔ force-disable Nuxt Image

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

