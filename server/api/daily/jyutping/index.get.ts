
export default defineEventHandler(() => {
  // Today’s date (simple YYYY-MM-DD)
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const today = `${yyyy}-${mm}-${dd}`

  // Mock pool (previously seen words)
  const mockWords = [
    {
      wordId: "gwai6-tired",
      word: "攰",
      jyutping: "gwai6",
      meaning: "tired",
      audioUrl: ""
    },
    {
      wordId: "mou5so2wai6-whatever",
      word: "冇所謂",
      jyutping: "mou5 so2 wai6",
      meaning: "whatever / doesn't matter",
      audioUrl: ""
    },
    {
      wordId: "hou2-lai6hoi6-great",
      word: "好犀利",
      jyutping: "hou2 sai1 lei6",
      meaning: "very impressive",
      audioUrl: ""
    }
  ]

  // Deterministic daily selection
  const index = d.getDate() % mockWords.length
  const chosen = mockWords[index]

  return {
    date: today,
    ...chosen
  }
})