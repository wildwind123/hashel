<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    variant = "default",
    disabled = false,
    children,
  }: { variant?: "default" | "primary"; disabled?: boolean; children?: Snippet } = $props();
</script>

<button type="button" class={["btn", variant]} {disabled}>
  {@render children?.()}
</button>

<style>
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
    background: #ff3e00;
    border-color: #ff3e00;
    color: #fff;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
