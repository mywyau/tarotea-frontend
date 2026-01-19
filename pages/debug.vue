<script setup lang="ts">
onMounted(async () => {
  const { getAccessToken } = await useAuth()
  const token = await getAccessToken()
  console.log('ACCESS TOKEN:', token)

  const me = await useMe()
  console.log('ME:', me)
})
</script>

<template>
  <div class="p-4">
    Check the console
  </div>
</template>
