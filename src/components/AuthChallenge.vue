<template>
  <div class="modal is-active centered" v-if="visible">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <span class="is-flex is-flex-shrink-0"> </span>
        <p class="modal-card-title is-title-shrink">
          {{ $gettext("Authentication") }}
        </p>
        <button
          class="delete"
          aria-label="close"
          @click="cancelInput()"
        ></button>
      </header>
      <section class="modal-card-body">
        <p v-if="accountName" class="account-name" id="auth-account-name">
          {{ $gettext("Wallet: %{ name }", { name: translatedAccountName }) }}
        </p>
        <p class="failed-unlock" v-if="state === 'failedUnlock'">
          {{ $gettext("Failed authentication. Please try again.") }}
        </p>
        <component
          :is="handler.Ui.Challenge.name"
          :handler="handler"
          :state="state"
          @submitInput="submitInput"
        />
      </section>
      <footer class="modal-card-foot is-justify-content-flex-end"></footer>
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { translateWalletLabel } from "@/utils/account"
  import AuthChallengeRetention from "@/components/AuthChallengeRetention.vue"
  import AuthChallengeDirect from "@/components/AuthChallengeDirect.vue"

  @Options({
    name: "AuthChallenge",
    components: {
      AuthChallengeDirect,
      AuthChallengeRetention,
    },
    data() {
      return {
        visible: false,
        state: null,
        accountName: null,
        handler: {},
        callbacks: {},
      }
    },

    created() {
      this.$auth.registerRequestCredentials(
        (state: string, handler: any, accountName?: string | false) =>
          new Promise((resolve, reject) => {
            this.callbacks = { resolve, reject }
            this.show(handler, state, accountName)
          })
      )
    },
    computed: {
      translatedAccountName(): string {
        return translateWalletLabel(this.accountName || "", this.$gettext)
      },
    },
    methods: {
      submitInput(credsInput: string) {
        this.hide()
        this.callbacks.resolve(credsInput)
      },

      cancelInput(error?: any) {
        this.hide()
        this.$msg.warning(this.$gettext("Operation canceled"))
        this.callbacks.reject(
          error || new Error("User canceled the dialog box")
        )
      },

      hide() {
        this.visible = false
        // Destroys in memory previous challenge structure
        this.handler = false
      },

      show(handler: any, state: string, accountName?: string | false) {
        this.visible = true
        this.handler = handler
        this.state = state
        this.accountName = accountName || null
      },
    },
  })
  export default class AuthChallenge extends Vue {}
</script>
<style lang="scss" scoped>
  .modal-card {
    position: relative;
    top: -5vh;
  }
  .failed-unlock {
    color: red;
  }
</style>
