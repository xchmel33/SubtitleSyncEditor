<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  stuck: {
    type: Boolean,
    default: false,
  },
})
console.log('LoaderSpinner', props.text)
</script>

<template>
  <div class="overlay d-flex">
    <div class="d-flex align-center flex-column ma-auto">
      <v-progress-circular
        :indeterminate="!stuck"
        :model-value="stuck ? 95 : 0"
        color="orange"
        size="128"
        width="14"
      />
      <span>{{ text }}</span>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; /* or absolute, depending on your layout */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* Adjust color and opacity as needed */
  z-index: 100; /* Ensure this is below the FileManager but above other content */
}
</style>
