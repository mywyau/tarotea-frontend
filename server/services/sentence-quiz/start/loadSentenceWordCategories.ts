type WordIndex = {
  categories?: Record<string, Array<{ id?: string }>>;
};

export async function loadSentenceWordCategories(scope: "levels" | "topics", slug: string): Promise<Map<string, string>> {
  try {
    const index = await $fetch<WordIndex>(`/api/index/${scope}/${slug}`);
    const categories = new Map<string, string>();
    for (const [category, words] of Object.entries(index.categories ?? {})) {
      for (const word of words) {
        if (word.id) categories.set(word.id, category);
      }
    }
    return categories;
  } catch {
    return new Map();
  }
}
