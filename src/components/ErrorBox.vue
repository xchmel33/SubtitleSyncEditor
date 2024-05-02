<script setup>
defineProps({
  error: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <transition name="slide-down">
    <v-alert
      type="error"
      v-if="error"
      class="position-fixed mt-4 alert"
      style="top: 0; left: 50%; transform: translateX(-50%); z-index: 99"
      @click="$emit('update:error', '')"
    >
      {{ error }}
    </v-alert>
  </transition>
</template>

<style>
/* Transition enter and leave active */
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

/* Starting state for entering */
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px); /* Start slightly above */
}

/* Ending state for entering */
.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Starting state for leaving */
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Ending state for leaving */
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px); /* Move up slightly */
}
.rotated_input,
.rotated_input_label {
  writing-mode: vertical-lr; /* Rotate the text */
  transform: rotate(180deg); /* Flip the text so it reads from bottom to top */
  text-align: center;
}
.rotated_input {
  cursor: pointer;
  height: 300px;
  -webkit-appearance: slider-vertical; /* For WebKit browsers */
}
</style>
