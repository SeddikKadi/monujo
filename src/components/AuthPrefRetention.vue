<template>
  <div>
    <component
      :is="handler.subHandler.Ui.Pref.name"
      :handler="handler.subHandler"
      @submitConfig="submitConfig"
      @cancel="$emit('cancel')"
    />
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  import AuthPrefPin from "@/components/AuthPrefPin.vue"
  import AuthPrefDirect from "@/components/AuthPrefDirect.vue"

  @Options({
    name: "AuthPrefRetention",
    components: {
      AuthPrefPin,
      AuthPrefDirect,
    },
    props: {
      handler: Object,
    },
    emits: ["submitConfig", "cancel"],
    methods: {
      submitConfig(subUserConfig: string) {
        const userConfig = {
          subConfig: subUserConfig,
        }
        this.$emit("submitConfig", userConfig)
      },
    },
  })
  export default class AuthPrefRetention extends Vue {}
</script>
<style lang="scss" scoped></style>
