<script setup>
import Menu from '@/components/lib/Menu.vue'
</script>

<template>
  <Menu>
    <template #opener="{ methods }">
      <button
        @click.stop="
          () => {
            console.log('Open menu', methods)
            methods.toggleOpen()
          }
        "
      >
        Open
      </button>
    </template>
    <template #default>
      <div style="width: 300px; height: 300px">Menu Content</div>
    </template>
  </Menu>
</template>

<style></style>
