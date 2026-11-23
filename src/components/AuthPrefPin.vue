<template>
  <div class="auth-pref-pin">
    <div class="auth-pref-pin-fields">
      <div class="field">
        <label class="label" :for="pinId">{{ $gettext("New PIN code") }}</label>
        <div class="control has-icons-left has-icons-right">
          <PasswordField
            :id="pinId"
            :password="pin"
            @update:password="(x) => (pin = x)"
            v-on:keypress="onlyNumbers"
            :placeholder="$gettext('PIN code')"
            pattern="[0-9]{4}"
            inputmode="numeric"
            maxlength="4"
            autocomplete="new-password"
            @input="focusConfirmPin"
            ref="pin"
          />
        </div>
      </div>
      <div class="field">
        <label class="label" :for="pinConfId">{{
          $gettext("Confirmation")
        }}</label>
        <div class="control has-icons-left">
          <input
            :id="pinConfId"
            class="input"
            type="password"
            v-on:keypress="onlyNumbers"
            :placeholder="$gettext('PIN code confirmation')"
            pattern="[0-9]{4}"
            inputmode="numeric"
            maxlength="4"
            autocomplete="new-password"
            v-model="pinConf"
            ref="confirmPin"
          />
          <span class="icon is-small is-left">
            <fa-icon icon="key" />
          </span>
        </div>
      </div>
    </div>
    <p v-if="error" class="help is-danger">{{ error }}</p>
    <div class="auth-pref-pin-actions">
      <button
        class="button custom-button-modal has-text-weight-medium"
        :disabled="!isPinValid"
        @click="submitConfig()"
        ref="submit"
      >
        {{ $gettext("Save") }}
      </button>
      <button class="button is-default is-rounded" @click="$emit('cancel')">
        {{ $gettext("Cancel") }}
      </button>
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import PasswordField from "@/components/PasswordField.vue"
  @Options({
    displayName: "Code Pin",
    name: "AuthPrefPin",
    components: {
      PasswordField,
    },
    props: {
      handler: Object,
    },
    emits: ["submitConfig", "cancel"],
    data() {
      return {
        pinLength: 4,
        pin: "",
        pinConf: "",
      }
    },
    computed: {
      // Several wallets can have their form open at the same time.
      pinId(): string {
        return `auth-pref-pin-${this.$.uid}`
      },
      pinConfId(): string {
        return `auth-pref-pin-conf-${this.$.uid}`
      },
      isPinComplete(): boolean {
        return new RegExp(`^[0-9]{${this.pinLength}}$`).test(this.pin)
      },
      isPinValid(): boolean {
        return this.isPinComplete && this.pin === this.pinConf
      },
      error(): string | false {
        // Nothing to report while the confirmation is being typed.
        if (this.pinConf.length !== this.pinLength) return false
        if (!this.isPinComplete) {
          return this.$gettext("PIN code must contain %{ pinLength }", {
            pinLength: this.$ngettext(
              "%{ pinLength } digit",
              "%{ pinLength } digits",
              this.pinLength,
              {
                pinLength: this.pinLength,
              }
            ),
          })
        }
        if (this.pin !== this.pinConf) {
          return this.$gettext("Given PINs are different")
        }
        return false
      },
    },
    watch: {
      isPinValid(valid: boolean) {
        if (valid) this.setFocusSubmit()
      },
    },
    mounted() {
      this.setFocusPin()
    },
    methods: {
      onlyNumbers($event: any) {
        let keyCode = $event.keyCode ? $event.keyCode : $event.which
        if ((keyCode < 48 || keyCode > 57) && keyCode !== 46) {
          $event.preventDefault()
        }
      },
      focusConfirmPin() {
        if (this.pin.length == this.pinLength) {
          this.$nextTick(() => {
            this.$refs.confirmPin.focus()
            this.$refs.confirmPin.select()
          })
        }
      },
      submitConfig() {
        if (!this.isPinValid) return
        this.$emit("submitConfig", this.handler.toUserConfigJson(this.pin))
      },
      setFocusPin() {
        this.$nextTick(() => {
          if (this.$refs.pin) {
            this.$refs.pin.focus()
          }
        })
      },
      setFocusSubmit() {
        this.$nextTick(() => {
          if (this.$refs.submit) {
            this.$refs.submit.focus()
          }
        })
      },
    },
  })
  export default class AuthPrefPin extends Vue {}
</script>
<style lang="scss" scoped>
  .auth-pref-pin-fields {
    display: grid;
    // Side by side when there is room, one under the other otherwise
    grid-template-columns: repeat(auto-fit, minmax(9em, 1fr));
    gap: 1rem;
    .field {
      margin-bottom: 0;
    }
  }
  .auth-pref-pin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
