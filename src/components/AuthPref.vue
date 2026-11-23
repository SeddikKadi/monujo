<template>
  <div class="main auth-pref" id="simplified-auth">
    <div class="auth-pref-row">
      <label class="switch">
        <input
          type="checkbox"
          :checked="useSimplifiedAuth"
          :aria-label="
            name
              ? $gettext('PIN code for %{ name }', { name })
              : $gettext('Simplified authentication for this device')
          "
          @click="switchSimplifiedAuth"
          ref="checkbox"
        />
        <span class="slider round"></span>
      </label>
      <div
        class="auth-pref-body"
        :class="{
          'auth-pref-wallet card': !!name,
          'is-off': !useSimplifiedAuth,
        }"
      >
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
        <div class="auth-pref-status">
          <fa-icon v-if="isActive" icon="check" class="auth-pref-status-icon" />
          <span>{{ statusLabel }}</span>
        </div>
        <div v-if="isActive" class="auth-pref-edit">
          <button
            class="button has-text-weight-medium is-rounded action"
            :class="{ 'is-pay': !editing }"
            :aria-label="
              name
                ? $gettext('Edit the PIN code for %{ name }', { name })
                : $gettext('Edit')
            "
            @click="unlock()"
            :disabled="editing"
          >
            <span>{{ $gettext("Edit") }}</span>
            <span class="icon">
              <fa-icon class="fa-md" :icon="locked ? 'lock' : 'lock-open'" />
            </span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="editing && useSimplifiedAuth" class="auth-pref-editor">
      <component
        :is="handler.Ui.Pref.name"
        :handler="handler"
        @submitConfig="submitConfig"
        @cancel="cancelEdit"
      />
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

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
        // A code is saved for this wallet on this device
        configured: false,
      }
    },
    computed: {
      isActive(): boolean {
        return this.useSimplifiedAuth && this.configured
      },
      statusLabel(): string {
        if (!this.useSimplifiedAuth) return this.$gettext("Password")
        return this.configured
          ? this.$gettext("PIN code active")
          : this.$gettext("PIN code to set")
      },
    },
    mounted() {
      this.configured = !!this.handler.userConfig
      this.useSimplifiedAuth = this.configured
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
        this.configured = true
        this.editing = false
        this.$forceUpdate()
      },
      cancelEdit() {
        this.editing = false
        if (!this.configured) {
          // No code was saved: the wallet keeps asking for its password.
          this.setUseSimplifiedAuth(false)
          this.locked = true
        }
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
          if (!this.configured) {
            // Nothing was saved yet, so there is nothing to protect.
            this.cancelEdit()
            return
          }
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
          this.configured = false
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
        // Ask for the code right away: the switch alone saves nothing.
        this.editing = true
      },
    },
  })
  export default class AuthPref extends Vue {}
</script>
<style lang="scss" scoped>
  // Bulma override variables
  @import "@/assets/custom-variables";
  @import "@/assets/switch-prefs";
  $switch-width: 48px;
  $row-gap: 0.75rem;

  .auth-pref {
    // The row adapts to the width it really gets (see the end of the file).
    container-type: inline-size;
    container-name: auth-pref;
  }
  .auth-pref-row,
  .auth-pref-body {
    display: flex;
    align-items: center;
    gap: $row-gap;
  }
  .auth-pref-body {
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
    row-gap: 0.25rem;
  }
  // A wallet is drawn like in the account list of the dashboard.
  .auth-pref-wallet {
    padding: 0.5rem 0.75rem 0.5rem 1.5rem;
    border-radius: 43px;
    background-color: $inner-card-background-color;
    border: 1px solid $inner-card-border-color;
    color: $inner-card-text-color;
    &.is-off {
      // Like an inactive wallet there: flat, with a wider grey border
      // that the padding makes up for.
      padding: calc(0.5rem - 1px) calc(0.75rem - 1px) calc(0.5rem - 1px)
        calc(1.5rem - 1px);
      background-color: transparent;
      border: 2px solid #eee;
      box-shadow: none;
    }
  }
  .switch,
  .auth-pref-status,
  .auth-pref-edit {
    flex-shrink: 0;
  }
  .auth-pref-text {
    flex: 1 1 8em;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .auth-pref-identifier {
    font-size: 0.8em;
    font-style: italic;
    color: $inner-card-text-color-backend;
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .auth-pref-description {
    font-size: 0.9em;
  }
  .auth-pref-status {
    display: flex;
    align-items: center;
    gap: 0.4em;
    font-size: 0.85em;
    white-space: nowrap;
  }
  .auth-pref-status-icon {
    color: $color-2;
  }
  .is-off .auth-pref-status {
    color: rgba(0, 0, 0, 0.6);
  }
  .auth-pref-edit {
    margin-left: auto;
  }
  .auth-pref-edit .button {
    // Keep a compact button with breathing room around its text and icon.
    min-height: 28px;
    height: auto;
    padding: 0.25em 1em;
    font-size: 0.85em;
  }
  .auth-pref-editor {
    // Lined up with the wallet, after the switch
    margin: 1rem 0 0.25rem calc(#{$switch-width} + #{$row-gap});
  }
  // Not enough room for one line, as on a phone: the name gets its own
  // line, the status and the button share the next one, and the form
  // uses the full width.
  @container auth-pref (max-width: 29em) {
    .auth-pref-text {
      flex-basis: 100%;
    }
    .auth-pref-wallet {
      border-radius: 24px;
    }
    .auth-pref-editor {
      margin-left: 0;
    }
  }
</style>
