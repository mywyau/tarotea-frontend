import { toValue, type MaybeRefOrGetter } from 'vue'

export function useLearningPageSeo(title: MaybeRefOrGetter<string>, description: MaybeRefOrGetter<string>) {
  useSeoMeta({
    title: () => toValue(title),
    description: () => toValue(description),
    ogTitle: () => toValue(title),
    ogDescription: () => toValue(description),
  })
}
