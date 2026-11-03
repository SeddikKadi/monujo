<template>
  <PrefsSection class="main">
    <template #header>
      <div class="is-flex is-align-items-center">
        <div class="switch-centered">
          <label class="switch">
            <input
              type="checkbox"
              :checked="useCustomLanguage"
              :aria-label="$gettext('Use custom language')"
              @click="switchCustomLanguage"
              ref="langCheckbox"
            />
            <span class="slider round"></span>
          </label>
        </div>
        <div>{{ $gettext("Use custom language") }}</div>
      </div>
    </template>
    <div v-if="useCustomLanguage" class="select">
      <select
        v-model="userLanguage"
        :aria-label="$gettext('Language settings')"
      >
        <option
          v-for="(name, key) in $language.available"
          :key="key"
          :value="key"
        >
          {{ name }}
        </option>
      </select>
    </div>
  </PrefsSection>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import PrefsSection from "@/components/PrefsSection.vue"
  @Options({
    name: "LangPrefs",
    components: { PrefsSection },
    props: {
      prefsData: Object,
    },
    data() {
      return {
        useCustomLanguage: false,
        userLanguage: null,
      }
    },
    async mounted() {
      this.userLanguage = (await this.$localSettings.load())?.language

      if (this.userLanguage) {
        this.useCustomLanguage = true
      }
      this.userLanguage = this.userLanguage || this.$language.current
    },
    watch: {
      userLanguage: function (): void {
        this.setCustomLanguage(this.userLanguage)
      },
    },
    methods: {
      setUseCustomLanguage(value: any) {
        this.setCustomLanguage(value ? this.userLanguage : null)
        this.useCustomLanguage = value
        // XXXvlab: nextTick didn't work.
        setTimeout(() => {
          this.$refs.langCheckbox.checked = value
        }, 0)
      },
      switchCustomLanguage(e: any) {
        e.preventDefault()
        this.setUseCustomLanguage(!this.useCustomLanguage)
      },
      async setCustomLanguage(l: string) {
        let settings = (await this.$localSettings.load()) || {}
        if (settings.language != l) {
          settings.language = l
          if (!l || this.useCustomLanguage) {
            await this.$localSettings.save(settings)
            await this.$store.dispatch("switchLocale", l)
          }
        }
      },
    },
  })
  export default class LangPrefs extends Vue {}
</script>
<style lang="scss" scoped>
  @import "@/assets/custom-variables";
  @import "@/assets/switch-prefs";

  .switch-centered {
    padding-right: 7px;
  }
</style>
