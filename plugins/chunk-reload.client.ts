export default defineNuxtPlugin(() => {
  window.addEventListener("error", (event) => {
    const target = event.target as HTMLScriptElement | null

    if (target?.tagName === "SCRIPT") {
      console.warn("Chunk failed to load — forcing reload")
      window.location.reload()
    }
  })
})