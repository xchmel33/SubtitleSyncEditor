<script setup>
defineProps({
  text: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div
    class="overlay d-flex"
    v-if="text"
  >
    <div class="d-flex align-center flex-column ma-auto">
      <v-progress-circular
        indeterminate
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
  z-index: 10; /* Ensure this is below the FileManager but above other content */
}
</style>
