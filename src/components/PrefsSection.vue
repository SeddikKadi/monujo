<template>
  <div class="prefs-section">
    <header v-if="title || $slots.header" :class="primary ? 'mb-5' : 'mb-4'">
      <slot name="header">
        <component
          :is="primary ? 'h2' : 'h3'"
          class="prefs-section-title"
          :class="primary ? 'custom-card-title' : 'prefs-section-subtitle'"
          >{{ title }}</component
        >
        <p v-if="description" class="prefs-section-description is-size-7">
          {{ description }}
        </p>
      </slot>
    </header>
    <div class="prefs-section-content">
      <slot />
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  /** Each semantic settings section indents its children by one shared step. */
  @Options({
    name: "PrefsSection",
    props: {
      title: String,
      description: String,
      primary: Boolean,
    },
  })
  export default class PrefsSection extends Vue {}
</script>
<style lang="scss" scoped>
  .prefs-section-content {
    margin-inline-start: var(--prefs-indent, 1rem);
    min-width: 0;
  }
  .prefs-section-title {
    padding-bottom: 0;
  }
  .prefs-section-subtitle {
    font-weight: 400;
    font-size: 0.95em;
    opacity: 0.75;
  }
  .prefs-section-description {
    opacity: 0.75;
  }
</style>
