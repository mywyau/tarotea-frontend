<script setup lang="ts">
const { refresh } = useMeState()

onMounted(() => {
  refresh()
})
</script>