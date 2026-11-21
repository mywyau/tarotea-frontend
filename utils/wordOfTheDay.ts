export const dayInMilliseconds = 86_400_000

// A small selection from the published word entries, available even when the CDN is offline.
const offlineWords = [
  { word: "朋友", jyutping: "pang4 jau5", meaning: "friend" },
  { word: "唔該", jyutping: "m4 goi1", meaning: "please / thanks / excuse me" },
  { word: "行", jyutping: "haang4", meaning: "walk; go on foot" },
  { word: "媽媽", jyutping: "maa4 maa1", meaning: "mother / mum" },
  { word: "幫手", jyutping: "bong1 sau2", meaning: "to help / give a hand" },
  { word: "洗手間", jyutping: "sai2 sau2 gaan1", meaning: "bathroom / toilet" },
  { word: "哥哥", jyutping: "go4 go1", meaning: "older brother" },
  { word: "食", jyutping: "sik6", meaning: "eat" },
  { word: "明", jyutping: "ming4", meaning: "understand" },
  { word: "你哋", jyutping: "nei5 dei6", meaning: "you (plural)" },
  { word: "唔舒服", jyutping: "m4 syu1 fuk6", meaning: "unwell" },
  { word: "睇", jyutping: "tai2", meaning: "to look at; to watch; to read" },
  { word: "急事", jyutping: "gap1 si6", meaning: "urgent matter" },
  { word: "人", jyutping: "jan4", meaning: "person / people" },
  { word: "我哋", jyutping: "ngo5 dei6", meaning: "we / us" },
  { word: "坐", jyutping: "co5", meaning: "sit" },
  { word: "喺邊度", jyutping: "hai2 bin1 dou6", meaning: "where (is it)" },
  { word: "多謝", jyutping: "do1 ze6", meaning: "thank you; thanks (for gifts, kindness, or favors)" },
  { word: "飲", jyutping: "jam2", meaning: "drink" },
  { word: "細佬", jyutping: "sai3 lou2", meaning: "little brother" },
  { word: "講", jyutping: "gong2", meaning: "speak" },
  { word: "有問題", jyutping: "jau5 man6 tai4", meaning: "there’s a problem" },
  { word: "爸爸", jyutping: "baa4 baa1", meaning: "dad" },
  { word: "做", jyutping: "zou6", meaning: "to do; to make" },
  { word: "迷路", jyutping: "mai4 lou6", meaning: "lost" },
  { word: "細妹", jyutping: "sai3 mui2", meaning: "little sister" },
  { word: "返", jyutping: "faan1", meaning: "return" },
  { word: "洗手", jyutping: "sai2 sau2", meaning: "to wash hands" },
  { word: "聽", jyutping: "teng1", meaning: "listen" },
  { word: "唔好意思", jyutping: "m4 hou2 ji3 si3", meaning: "excuse me / sorry (polite)" },
  { word: "佢哋", jyutping: "keoi5 dei6", meaning: "they / them" },
  { word: "企", jyutping: "kei5", meaning: "stand" },
  { word: "去", jyutping: "heoi3", meaning: "go" },
  { word: "緊急", jyutping: "gan2 gap1", meaning: "emergency" },
  { word: "姐姐", jyutping: "ze1 ze1", meaning: "older sister" },
  { word: "點樣去", jyutping: "dim2 joeng6 heoi3", meaning: "how to get to" },
  { word: "住", jyutping: "zyu6", meaning: "live" },
  { word: "壞咗", jyutping: "waai6 zo2", meaning: "it’s broken" },
  { word: "救命", jyutping: "gau3 meng6", meaning: "Help! / Save me!" },
  { word: "唔見咗", jyutping: "m4 gin3 zo2", meaning: "it’s lost / missing" },
] as const

export function utcDayNumber(timestamp: number) {
  return Math.floor(timestamp / dayInMilliseconds)
}

export function itemForDay<T>(day: number, entries: readonly T[]): T {
  if (!entries.length) throw new Error('Daily rotation has no entries')
  return entries[((day % entries.length) + entries.length) % entries.length]
}

export function offlineWordForDay(day: number) {
  return itemForDay(day, offlineWords)
}
