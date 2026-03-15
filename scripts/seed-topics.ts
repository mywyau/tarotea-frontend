import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const CDN_BASE = process.env.CDN_BASE;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TOPICS = [
  "clothing",
  "fruits-vegetables",
  "greetings-polite",
  "measure-quantities",
  "survival-essentials",
  "time-dates",
  "dim-sum",
  "restaurant-menu",
  "family-members",
  "countries",
  "emotions",
  "furniture",
  "sports-fitness",
  "weather",
  "technology",
  "housing",
  "transport-travel",
  "health",
  "daily-life",
  "materials",
  "animals",
  "science",
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  for (const topicSlug of TOPICS) {
    console.log(`Fetching topic: ${topicSlug}`);

    const topicData = await fetch(
      `${CDN_BASE}/topics/${topicSlug}.json`
    ).then((res) => res.json());

    const words = Object.values(topicData.categories).flat();

    // ✅ 1️⃣ Insert topic (safe upsert)
    await pool.query(
      `
      insert into topics (slug, title, description)
      values ($1,$2,$3)
      on conflict (slug)
      do update set
        title = excluded.title,
        description = excluded.description
    `,
      [
        topicData.topic,
        topicData.title,
        topicData.description,
      ]
    );

    // ✅ 2️⃣ Get topic ID
    const topicRes = await pool.query(
      `select id from topics where slug = $1`,
      [topicData.topic]
    );

    const topicId = topicRes.rows[0].id;

    // ✅ 3️⃣ Insert words + link
    for (const word of words as any[]) {

      // Insert word (core table)
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
          1,
        ]
      );

      // Link word to topic
      await pool.query(
        `
        insert into word_topics (word_id, topic_id)
        values ($1,$2)
        on conflict do nothing
      `,
        [word.id, topicId]
      );

      console.log("✓", word.id);
    }

    console.log("");
  }

  console.log("✅ Seeding complete.");
  process.exit();
}

if (process.env.NODE_ENV === "production") {
  console.log("❌ Seeding disabled in production");
  process.exit(1);
}

seed();
