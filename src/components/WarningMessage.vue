<template>
  <div class="info-bubble warning-message">
    <span class="warning">
      <i class="fas icon fa-key">
        <fa-icon icon="fa-triangle-exclamation" />
      </i>
    </span>
    <span class="warning-text">
      <slot />
    </span>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  @Options({
    name: "WarningMessage",
  })
  export default class WarningMessage extends Vue {}
</script>

<style lang="scss" scoped>
  .info-bubble {
    background-color: var(--color-1, #e4f2f1);
    border-radius: 1em;
    padding: 0.2em;
  }

  .warning-message {
    display: flex;
    align-items: baseline;
    gap: 0.25em;
  }

  .warning {
    line-height: 1;
    margin-left: 0.25em;
    flex-shrink: 0;
  }

  .warning-text {
    display: block;
  }
</style>
