export const dayInMilliseconds = 86_400_000

// A small selection from the published word entries, available even when the CDN is offline.
const offlineWords = [
  { word: "朋友", jyutping: "pang4 jau5", meaning: "friend", audioFile: "pang4jau5-friend.mp3" },
  { word: "唔該", jyutping: "m4 goi1", meaning: "please / thanks / excuse me", audioFile: "m4goi1-please-thanks-excuse-me.mp3" },
  { word: "行", jyutping: "haang4", meaning: "walk; go on foot", audioFile: "haang4-walk-go-on-foot.mp3" },
  { word: "媽媽", jyutping: "maa4 maa1", meaning: "mother / mum", audioFile: "maa4maa1-mother-mum.mp3" },
  { word: "幫手", jyutping: "bong1 sau2", meaning: "to help / give a hand", audioFile: "bong1sau2-to-help-give-a-hand.mp3" },
  { word: "洗手間", jyutping: "sai2 sau2 gaan1", meaning: "bathroom / toilet", audioFile: "sai2sau2gaan1-bathroom-toilet.mp3" },
  { word: "哥哥", jyutping: "go4 go1", meaning: "older brother", audioFile: "go4go1-older-brother.mp3" },
  { word: "食", jyutping: "sik6", meaning: "eat", audioFile: "sik6-eat.mp3" },
  { word: "明", jyutping: "ming4", meaning: "understand", audioFile: "ming4-understand.mp3" },
  { word: "你哋", jyutping: "nei5 dei6", meaning: "you (plural)", audioFile: "nei5dei6-you-plural.mp3" },
  { word: "唔舒服", jyutping: "m4 syu1 fuk6", meaning: "unwell", audioFile: "m4syu1fuk6-unwell.mp3" },
  { word: "睇", jyutping: "tai2", meaning: "to look at; to watch; to read", audioFile: "tai2-to-look-at-to-watch-to-read.mp3" },
  { word: "急事", jyutping: "gap1 si6", meaning: "urgent matter", audioFile: "gap1si6-urgent-matter.mp3" },
  { word: "人", jyutping: "jan4", meaning: "person / people", audioFile: "jan4-person-people.mp3" },
  { word: "我哋", jyutping: "ngo5 dei6", meaning: "we / us", audioFile: "ngo5dei6-we-us.mp3" },
  { word: "坐", jyutping: "co5", meaning: "sit", audioFile: "co5-sit.mp3" },
  { word: "喺邊度", jyutping: "hai2 bin1 dou6", meaning: "where (is it)", audioFile: "hai2bin1dou6-where-is-it.mp3" },
  { word: "多謝", jyutping: "do1 ze6", meaning: "thank you; thanks (for gifts, kindness, or favors)", audioFile: "do1ze6-thank-you-thanks-for-gifts-kindness-or-favors.mp3" },
  { word: "飲", jyutping: "jam2", meaning: "drink", audioFile: "jam2-drink.mp3" },
  { word: "細佬", jyutping: "sai3 lou2", meaning: "little brother", audioFile: "sai3lou2-little-brother.mp3" },
  { word: "講", jyutping: "gong2", meaning: "speak", audioFile: "gong2-speak.mp3" },
  { word: "有問題", jyutping: "jau5 man6 tai4", meaning: "there’s a problem", audioFile: "jau5man6tai4-theres-a-problem.mp3" },
  { word: "爸爸", jyutping: "baa4 baa1", meaning: "dad", audioFile: "baa4baa1-dad.mp3" },
  { word: "做", jyutping: "zou6", meaning: "to do; to make", audioFile: "zou6-to-do-to-make.mp3" },
  { word: "迷路", jyutping: "mai4 lou6", meaning: "lost", audioFile: "mai4lou6-lost.mp3" },
  { word: "細妹", jyutping: "sai3 mui2", meaning: "little sister", audioFile: "sai3mui2-little-sister.mp3" },
  { word: "返", jyutping: "faan1", meaning: "return", audioFile: "faan1-return.mp3" },
  { word: "洗手", jyutping: "sai2 sau2", meaning: "to wash hands", audioFile: "sai2sau2-to-wash-hands.mp3" },
  { word: "聽", jyutping: "teng1", meaning: "listen", audioFile: "teng1-listen.mp3" },
  { word: "唔好意思", jyutping: "m4 hou2 ji3 si3", meaning: "excuse me / sorry (polite)", audioFile: "m4hou2ji3si3-excuse-me-sorry-polite.mp3" },
  { word: "佢哋", jyutping: "keoi5 dei6", meaning: "they / them", audioFile: "keoi5dei6-they-them.mp3" },
  { word: "企", jyutping: "kei5", meaning: "stand", audioFile: "kei5-stand.mp3" },
  { word: "去", jyutping: "heoi3", meaning: "go", audioFile: "heoi3-go.mp3" },
  { word: "緊急", jyutping: "gan2 gap1", meaning: "emergency", audioFile: "gan2gap1-emergency.mp3" },
  { word: "姐姐", jyutping: "ze1 ze1", meaning: "older sister", audioFile: "ze1ze1-older-sister.mp3" },
  { word: "點樣去", jyutping: "dim2 joeng6 heoi3", meaning: "how to get to", audioFile: "dim2joeng6heoi3-how-to-get-to.mp3" },
  { word: "住", jyutping: "zyu6", meaning: "live", audioFile: "zyu6-live.mp3" },
  { word: "壞咗", jyutping: "waai6 zo2", meaning: "it’s broken", audioFile: "waai6zo2-its-broken.mp3" },
  { word: "救命", jyutping: "gau3 meng6", meaning: "Help! / Save me!", audioFile: "gau3meng6-save-me.mp3" },
  { word: "唔見咗", jyutping: "m4 gin3 zo2", meaning: "it’s lost / missing", audioFile: "m4gin3zo2-its-lost-missing.mp3" },
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
