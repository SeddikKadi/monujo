<template>
  <div>
    <p :class="configuredBiometryLogin ? 'mb-3' : ''">
      {{
        $gettext(
          "Would you like to use your device's biometric (fingerprint, face recognition, ...) capability to login ?"
        )
      }}
    </p>
    <p :class="configuredBiometryLogin ? 'mb-3' : ''">
      {{ $gettext("Your biometric login will be set up after your next manual login.") }}
    </p>
    <WarningMessage v-if="configuredBiometryLogin">
      {{ $gettext("Biometry is currently enabled for ") }}
      <strong>{{ configuredBiometryLogin }}</strong>
      {{
        $gettext(
          ". Enabling it here will replace it after your next login."
        )
      }}
    </WarningMessage>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import WarningMessage from "@/components/WarningMessage.vue"

  @Options({
    name: "BiometrySetupDialogContent",
    components: { WarningMessage },
    props: {
      configuredBiometryLogin: {
        type: String,
        default: "",
      },
    },
  })
  export default class BiometrySetupDialogContent extends Vue {
    configuredBiometryLogin!: string
  }
</script>
