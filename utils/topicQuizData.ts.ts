
export interface TopicQuestion {
  id: string
  word: string
  jyutping: string
  correctAnswer: string
  options: string[]
}

export const TOPIC_QUIZ_DATA: Record<string, TopicQuestion[]> = {
  "greetings-polite": [
    {
      id: "nei5hou2",
      word: "你好",
      jyutping: "nei5 hou2",
      correctAnswer: "hello",
      options: ["goodbye", "thank you", "hello", "sorry"]
    },
    {
      id: "m4goi1",
      word: "唔該",
      jyutping: "m4 goi1",
      correctAnswer: "thank you",
      options: ["sorry", "please", "thank you", "hello"]
    },
    {
      id: "do1ze6",
      word: "多謝",
      jyutping: "do1 ze6",
      correctAnswer: "thanks (formal)",
      options: ["sorry", "thanks (formal)", "goodnight", "excuse me"]
    }
  ]
}
