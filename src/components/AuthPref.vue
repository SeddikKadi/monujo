<template>
  <div class="main" id="simplified-auth">
    <div class="mb-5">
      <div class="mb-5 auth-pref-row">
        <div class="auth-pref-toggle">
          <label class="switch">
            <input
              type="checkbox"
              :checked="useSimplifiedAuth"
              :aria-label="
                name
                  ? $gettext('Simplified authentication for %{ name }', {
                      name,
                    })
                  : $gettext('Simplified authentication for this device')
              "
              @click="switchSimplifiedAuth"
              ref="checkbox"
            />
            <span class="slider round"></span>
          </label>
          <div class="auth-pref-text">
            <div v-if="name" class="auth-pref-name">{{ name }}</div>
            <div
              v-if="identifier"
              class="auth-pref-identifier"
              :title="identifier"
            >
              {{ identifier }}
            </div>
            <div v-if="showDescription" class="auth-pref-description">
              {{ $gettext("Simplified authentication for this device") }}
            </div>
          </div>
        </div>
        <div class="auth-pref-edit">
          <button
            class="button has-text-weight-medium is-rounded action"
            :class="{ 'is-pay': useSimplifiedAuth && !editing }"
            :aria-label="
              name
                ? $gettext('Edit authentication for %{ name }', { name })
                : $gettext('Edit')
            "
            @click="unlock()"
            :disabled="!useSimplifiedAuth || editing"
          >
            <span>{{ $gettext("Edit") }}</span>
            <span class="icon">
              <fa-icon class="fa-md" :icon="locked ? 'lock' : 'lock-open'" />
            </span>
          </button>
        </div>
      </div>
      <PrefsSection v-if="editing && useSimplifiedAuth">
        <component
          :is="handler.Ui.Pref.name"
          :handler="handler"
          @submitConfig="submitConfig"
        />
      </PrefsSection>
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  import PrefsSection from "@/components/PrefsSection.vue"
  import AuthPrefDirect from "@/components/AuthPrefDirect.vue"
  import AuthPrefRetention from "@/components/AuthPrefRetention.vue"

  /**
   * AuthPref component manages the Local Authentication preferences.
   *
   * Local authentication allows current device to use a usually simpler
   * authentication method in lieu of a fixed other authentication
   * method.
   *
   * Advantages here are numerous:
   *  - can leverage technology of the device (fingerprint, face, SMS, ...)
   *  - is usually quicker to provide
   *  - can combine and compose different authentication method
   *  - can change authentication tokens without changing the legacy global
   *    authentication method (that can not always easily change)
   *
   *
   */

  @Options({
    name: "AuthPref",
    components: {
      PrefsSection,
      AuthPrefDirect,
      AuthPrefRetention,
    },
    props: {
      handler: Object,
      requestCredentials: Function,
      name: [String, Boolean],
      identifier: String,
      showDescription: { type: Boolean, default: true },
      disabled: false,
    },
    data() {
      return {
        locked: true,
        editing: false,
        useSimplifiedAuth: false,
      }
    },
    mounted() {
      this.useSimplifiedAuth = !!this.handler.userConfig
    },
    methods: {
      async triggerChallenge(customRequestCredentialsFn?: any) {
        try {
          this.handler.accountAuthService.secret =
            await this.requestCredentials(customRequestCredentialsFn)
        } catch (err: any) {
          if (err.message === "User canceled the dialog box") {
            return false
          }
          console.log("Challenge failed:", err.message)
          return false
        }
        return true
      },
      /**
       * Trigger direct default challenge an disable any retention
       */
      triggerDefaultChallenge() {
        return this.triggerChallenge(async (state: any, userAccount: any) => {
          // By not asking the specific userAccount's auth, we remove
          // any retention mecanism aspect.
          const accountAuthService = await this.$auth.getAccountAuth()
          return await accountAuthService.requestCredentials(state)
        })
      },
      async submitConfig(subUserConfig: string) {
        let userConfig = { subConfig: subUserConfig }
        this.$emit("saveConfig", this.handler.accountAuthService, userConfig)
        this.handler.userConfig = null
        this.$forceUpdate()
      },
      async unlock() {
        if (!this.useSimplifiedAuth || this.editing) return
        if (this.locked && !(await this.triggerChallenge())) {
          return
        }
        this.locked = false
        this.editing = true
      },
      setUseSimplifiedAuth(value: any) {
        this.useSimplifiedAuth = value
        this.$refs.checkbox.checked = value
        // XXXvlab: nextTick didn't work.
        setTimeout(() => {
          this.$refs.checkbox.checked = value
        }, 0)
      },
      async switchSimplifiedAuth(e: any) {
        e.preventDefault()
        if (this.useSimplifiedAuth) {
          // Was on, switching off
          if (!(await this.triggerDefaultChallenge())) {
            // XXXvlab: vuejs won't see any changes so won't force
            // the checkbox to be unchecked. But it is automatically checked
            // despite the preventDefault.
            // this.useSimplifiedAuth = true
            this.setUseSimplifiedAuth(true)
            return
          }
          this.setUseSimplifiedAuth(false)
          this.locked = true
          this.editing = false
          this.$emit("saveConfig", this.handler.accountAuthService, null)
          this.handler.userConfig = null
          this.$forceUpdate()
          return
        }
        // ``useSimplifiedAuth`` was off, switching on
        if (!(await this.triggerDefaultChallenge())) {
          // XXXvlab: vuejs won't see any changes so won't force
          // the checkbox to be unchecked. But it is automatically checked
          // despite the preventDefault.
          // this.useSimplifiedAuth = false
          this.setUseSimplifiedAuth(false)
          return
        }
        this.setUseSimplifiedAuth(true)
        this.locked = false
        this.editing = false
      },
    },
  })
  export default class AuthPref extends Vue {}
</script>
<style lang="scss" scoped>
  // Bulma override variables
  @import "@/assets/custom-variables";
  @import "@/assets/switch-prefs";
  .auth-pref-row,
  .auth-pref-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .auth-pref-toggle {
    flex: 1;
    min-width: 0;
  }
  .switch,
  .auth-pref-edit {
    flex-shrink: 0;
  }
  .auth-pref-edit .button {
    // Keep a compact button with breathing room around its text and icon.
    min-height: 28px;
    height: auto;
    padding: 0.25em 1em;
    font-size: 0.85em;
  }
  .auth-pref-text {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .auth-pref-name {
    margin-bottom: 0.15rem;
  }
  .auth-pref-identifier {
    font-size: 0.85em;
    opacity: 0.65;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .auth-pref-description {
    font-size: 0.9em;
  }
</style>
