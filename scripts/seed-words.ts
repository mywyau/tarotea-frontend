// import fetch from "node-fetch"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pg

const CDN_BASE = process.env.CDN_BASE
const DATABASE_URL = process.env.DATABASE_URL

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// List your levels explicitly (clean and controlled)
const LEVELS = [
  // "level-one",
  // "level-two",
  // "level-three",
  // "level-four",
  "level-five",
  "level-six",
]

async function seed() {
  console.log("🌱 Seeding words table...\n")

  for (const level of LEVELS) {

    console.log(`Fetching level: ${level}`)

    const levelData = await fetch(
      `${CDN_BASE}/levels/${level}.json`
    ).then(res => res.json())

    const words = Object.values(levelData.categories).flat()

    for (const word of words as any[]) {

      await pool.query(`
        insert into words (
          id,
          word,
          jyutping,
          meaning,
          level_slug,
          topic_slug,
          part_of_speech,
          difficulty,
          updated_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,now())
        on conflict (id)
        do update set
          word = excluded.word,
          jyutping = excluded.jyutping,
          meaning = excluded.meaning,
          level_slug = excluded.level_slug,
          topic_slug = excluded.topic_slug,
          part_of_speech = excluded.part_of_speech,
          updated_at = now()
      `, [
        word.id,
        word.word,
        word.jyutping,
        word.meaning,
        level,
        levelData.topic ?? "core",   // optional
        word.pos?.[0] ?? null,
        1
      ])

      console.log("✓", word.id)
    }

    console.log("")
  }

  console.log("✅ Seeding complete.")
  process.exit()
}

if (process.env.NODE_ENV === "production") {
  console.log("❌ Seeding disabled in production");
  process.exit(1);
}

seed()

