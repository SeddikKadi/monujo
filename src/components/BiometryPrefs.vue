<template>
  <div class="main">
    <div class="is-flex">
      <div class="is-flex switch-container">
        <div class="switch-centered">
          <label class="switch">
            <input
              type="checkbox"
              :checked="useBiometry"
              @click="switchUseBiometry"
              ref="biometryCheckbox"
            />
            <span class="slider round"></span>
          </label>
        </div>
        <div class="mr-1 switch-centered">
          {{ $gettext("Use biometry for login") }}
        </div>
        <div
          class="justify-right"
          :class="{ missing: !hasCredentialsAvailable }"
        >
          <i class="ml-2 fas icon fa-triangle-exclamation">
            <fa-icon icon="fa-key"
          /></i>
        </div>
      </div>
    </div>
    <div
      v-if="!hasCredentialsAvailable && useBiometry"
      class="mb-3 info-bubble ml-4"
    >
      <span>
        <i class="ml-2 fas icon fa-key">
          <fa-icon icon="fa-triangle-exclamation"
        /></i>
      </span>
      <span>
        {{ $gettext("Your credentials will be saved after your next login") }}
      </span>
    </div>
  </div>
</template>
<script lang="ts">
  import { markRaw } from "vue"
  import { Options, Vue } from "vue-class-component"
  @Options({
    name: "BiometryPrefs",
    components: {},
    props: {},
    data() {
      return {
        useBiometry: false,
        hasCredentialsAvailable: false,
      }
    },
    async mounted() {
      this.useBiometry = (await this.$localSettings.load())?.biometryEnabled
      this.hasCredentialsAvailable =
        await this.$biometry.hasCredentialsAvailable("login")
    },
    methods: {
      setUseBiometry(value: any) {
        this.setUserBiometry(value)
        this.useBiometry = value
        // XXXvlab: nextTick didn't work.
        setTimeout(() => {
          this.$refs.biometryCheckbox.checked = value
        }, 0)
      },
      switchUseBiometry(e: any) {
        e.preventDefault()
        this.setUseBiometry(!this.useBiometry)
        console.log("useBiometry:", this.useBiometry)
      },
      async setUserBiometry(l: string) {
        let settings = (await this.$localSettings.load()) || {}
        settings.biometryEnabled = l
        await this.$localSettings.save(settings)
        if (!settings.biometryEnabled) {
          try {
            await this.$biometry.deleteCredentials("login")
          } catch (e) {
            console.error(e)
            throw e
          }
          this.hasCredentialsAvailable = false
        }
      },
    },
  })
  export default class BiometryPrefs extends Vue {}
</script>
<style lang="scss" scoped>
  @import "@/assets/custom-variables";
  @import "@/assets/switch-prefs";

  .custom-card-prefs {
    max-width: 550px;
    margin: auto;
  }
  .switch-centered {
    padding-right: 7px;
  }
  .info-bubble {
    background-color: var(--color-1, #e4f2f1);
    border-radius: 10px;
    padding: 0.2em;
    margin-top: 0.2em;
    font-size: smaller;
  }
  .missing {
    color: hsl(0deg, 0%, 86%);
  }
  .justify-right {
    position: absolute;
    right: 20px;
  }
  .switch-container {
    width: 100%;
  }
</style>
