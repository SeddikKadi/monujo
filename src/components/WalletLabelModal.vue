<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title is-title-shrink">
          {{ $gettext("Rename wallet") }}
        </p>
        <button
          class="delete"
          aria-label="close"
          @click="$modal.close()"
        ></button>
      </header>
      <section class="modal-card-body">
        <!-- Isolate the label from any password fields behind the modal. -->
        <form
          id="wallet-label-form"
          class="field"
          autocomplete="off"
          @submit.prevent="save"
        >
          <label class="label" for="wallet-label">
            {{ $gettext("Wallet name") }}
          </label>
          <p id="wallet-label-visibility" class="help mb-2">
            {{
              $gettext("This name is visible to people who pay this wallet.")
            }}
          </p>
          <div class="control">
            <input
              id="wallet-label"
              name="wallet-label"
              autocomplete="off"
              ref="labelInput"
              v-model="label"
              @input="serverError = null"
              class="input"
              :class="{ 'is-danger': showError }"
              type="text"
              required
              maxlength="30"
              aria-describedby="wallet-label-visibility wallet-label-error"
              :aria-invalid="showError"
              @blur="touched = true"
            />
          </div>
          <p v-if="showError" id="wallet-label-error" class="help is-danger">
            {{ error }}
          </p>
        </form>
      </section>
      <footer
        class="
          modal-card-foot
          custom-modal-card-foot
          is-justify-content-flex-end
        "
      >
        <button
          class="button custom-button-modal has-text-weight-medium"
          @click="$modal.close()"
        >
          <span>{{ $gettext("Cancel") }}</span>
        </button>
        <button
          id="save-wallet-label"
          class="button custom-button-modal has-text-weight-medium"
          :disabled="isSaving || !isValid"
          @click="save"
        >
          <span>{{ $gettext("Save") }}</span>
        </button>
      </footer>
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  import { mapGetters } from "vuex"

  import {
    getAccountBackend,
    getOtherWalletNames,
    getUserAccount,
    translateWalletLabel,
    validateWalletName,
    walletNameErrorMessage,
  } from "@/utils/account"

  @Options({
    name: "WalletLabelModal",
    data() {
      return {
        label: "",
        initialLabel: "",
        isSaving: false,
        touched: false,
        serverError: null as string | null,
      }
    },
    computed: {
      isUnchanged(): boolean {
        return this.label === this.initialLabel && this.label !== ""
      },
      error(): string | null {
        if (this.serverError) return this.serverError
        if (this.isUnchanged) return null
        return validateWalletName(
          this.label,
          getOtherWalletNames(
            getAccountBackend(this.getBackends(), this.userAccount),
            this.$gettext,
            this.userAccount
          ),
          this.$gettext
        )
      },
      isValid(): boolean {
        return !this.error
      },
      showError(): boolean {
        return (
          !!this.error && (this.touched || this.label !== this.initialLabel)
        )
      },
      ...mapGetters(["getBackends"]),
    },
    created() {
      this.userAccount = getUserAccount(this.$modal.args.value[0].account)
      this.label = translateWalletLabel(
        this.userAccount.label || "",
        this.$gettext
      )
      this.initialLabel = this.label
    },
    mounted() {
      this.$refs.labelInput.focus()
    },
    methods: {
      async save() {
        this.touched = true
        if (this.isSaving || !this.isValid) return
        // Nothing to rename; also keeps a name saved before the rules.
        if (this.isUnchanged) {
          this.$modal.close()
          return
        }
        this.isSaving = true
        try {
          await this.userAccount.setLabel(this.label.trim())
        } catch (err) {
          if ((err as any)?.name === "InvalidWalletLabel") {
            this.serverError = walletNameErrorMessage(
              (err as any).reason,
              this.$gettext
            )
            return
          }
          console.error("Could not rename the wallet", err)
          this.$msg.error(this.$gettext("The wallet could not be renamed."))
          return
        } finally {
          this.isSaving = false
        }
        this.$modal.args.value[0].refreshAccounts?.()
        this.$modal.close()
      },
    },
  })
  export default class WalletLabelModal extends Vue {}
</script>
