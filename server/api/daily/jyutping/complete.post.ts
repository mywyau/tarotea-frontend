export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  console.log("Daily decode completed:", body)

  // For now just pretend we awarded XP
  return {
    success: true,
    awardedXp: body.perfect ? 100 : body.passed ? 70 : 0
  }
})