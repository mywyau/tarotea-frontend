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

const LEVELS = [
  "level-one",
  "level-two",
  "level-three",
  "level-four",
  "level-five",
  "level-six",
]

async function seed() {
  console.log("🌱 Seeding levels...\n")

  for (const levelSlug of LEVELS) {

    console.log(`Fetching level: ${levelSlug}`)

    const levelData = await fetch(
      `${CDN_BASE}/levels/${levelSlug}.json`
    ).then(res => res.json())

    const words = Object.values(levelData.categories).flat()

    // ✅ 1️⃣ Insert level (safe upsert)
    await pool.query(
      `
      insert into levels (slug, title, order_index)
      values ($1,$2,$3)
      on conflict (slug)
      do update set
        title = excluded.title,
        order_index = excluded.order_index
      `,
      [
        levelSlug,
        levelData.title ?? levelSlug,
        levelData.order ?? 0
      ]
    )

    // ✅ 2️⃣ Get level ID
    const levelRes = await pool.query(
      `select id from levels where slug = $1`,
      [levelSlug]
    )

    const levelId = levelRes.rows[0].id

    // ✅ 3️⃣ Insert words + link
    for (const word of words as any[]) {

      // Insert into words (core table)
      await pool.query(
        `
        insert into words (
          id,
          word,
          jyutping,
          meaning,
          difficulty,
          updated_at
        )
        values ($1,$2,$3,$4,$5,now())
        on conflict (id)
        do update set
          word = excluded.word,
          jyutping = excluded.jyutping,
          meaning = excluded.meaning,
          difficulty = excluded.difficulty,
          updated_at = now()
        `,
        [
          word.id,
          word.word,
          word.jyutping,
          word.meaning,
          1
        ]
      )

      // Link word → level
      await pool.query(
        `
        insert into word_levels (word_id, level_id)
        values ($1,$2)
        on conflict do nothing
        `,
        [word.id, levelId]
      )

      console.log("✓", word.id)
    }

    console.log("")
  }

  console.log("✅ Level seeding complete.")
  process.exit()
}

if (process.env.NODE_ENV === "production") {
  console.log("❌ Seeding disabled in production")
  process.exit(1)
}

seed()
