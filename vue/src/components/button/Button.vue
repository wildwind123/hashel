<script setup lang="ts">
withDefaults(defineProps<{ variant?: "default" | "primary"; disabled?: boolean }>(), {
  variant: "default",
  disabled: false,
});
</script>

<template>
  <button type="button" :class="['btn', variant]" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  font: inherit;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #c9ced6;
  background: #fff;
  color: #1f2328;
  cursor: pointer;
}
.btn.primary {
  background: #42b883;
  border-color: #42b883;
  color: #fff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
