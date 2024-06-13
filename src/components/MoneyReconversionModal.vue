<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <template v-if="$modal.step.value == 1">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title is-title-shrink">
            {{ $gettext("Reconversion") }}
          </p>
          <button class="delete" aria-label="close" @click="close()"></button>
        </header>
        <section class="modal-card-body">
          <MoneyTransaction
            directionTransfer="send"
            :account="$modal.args.value[0]?.account"
            :selectedRecipient="selectedRecipient"
            :parentErrors="errors"
            @update:amount="(x) => (amount = x)"
            @update:message="(x) => (message = x)"
            @update:isValid="(x) => (isValid = x)"
          />
        </section>
        <footer
          class="
            modal-card-foot
            custom-modal-card-foot
            is-justify-content-flex-end
          "
        >
          <button
            :disabled="!isValid"
            class="button custom-button-modal has-text-weight-medium"
            id="send-money-button"
            @click="sendReconversion()"
          >
            {{ $gettext("Reconversion") }}
          </button>
        </footer>
      </div>
    </template>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { mapModuleState } from "@/utils/vuex"
  import { e as LokapiExc } from "@lokavaluto/lokapi-browser"

  import MoneyTransaction from "@/components//MoneyTransaction.vue"

  @Options({
    name: "MoneyReconversionModal",
    components: {
      MoneyTransaction,
    },
    data() {
      return {
        amount: null,
        message: null,
        isValid: false,
        transferOngoing: false,
        errors: false,
        ownSelectedAccount: null,
        selectedRecipient: null,
      }
    },
    mounted() {
      this.ownSelectedAccount = this.$modal.args.value[0]?.account
      this.selectedRecipient =
        this.$modal.args.value[0]?.account.safeWalletRecipient
    },
    computed: {
      ...mapModuleState("lokapi", ["userProfile"]),
    },
    methods: {
      async sendReconversion(): Promise<void> {
        if (this.transferOngoing) {
          console.log(
            "Debounced `sendReconversion()` call as another transfer is ongoing..."
          )
          return
        }
        this.transferOngoing = true

        this.errors = false

        if (this.ownSelectedAccount._obj.getGlobalBalance) {
          let realBal
          try {
            realBal = await this.ownSelectedAccount._obj.getGlobalBalance(
              "latest"
            )
          } catch (err) {
            this.$msg.error(
              this.$gettext(
                "An unexpected issue occurred while checking available funds. " +
                  "The transaction was not sent. We are sorry for the inconvenience."
              ) +
                "<br/>" +
                this.$gettext(
                  "You can try again. If the issue persists, " +
                    "please contact your administrator."
                )
            )
            console.error("getGlobalBalance failed:", err)
            this.transferOngoing = false
            return
          }
          const amount_cents = parseInt(this.amount.replace(".", ""))
          const realBal_cents = parseInt(realBal.replace(".", ""))
          const bal_cents = parseInt(
            this.ownSelectedAccount.bal.toFixed(2).replace(".", "")
          )

          if (amount_cents > bal_cents) {
            this.errors = this.$gettext(
              "Transaction was refused due to insufficient balance"
            )
            return
          }
          if (amount_cents > realBal_cents) {
            this.errors = this.$gettext(
              "The last transactions were not yet all processed. " +
                "To ensure that this payment can be sent, you need " +
                "to wait for these pending transactions to be processed. " +
                "This can take a few minutes. You can also lower your " +
                "transaction amount underneath %{ realBal } %{ currency }. " +
                "If the problem persists, please contact an administrator.",
              {
                realBal,
                currency: this.ownSelectedAccount.curr,
              }
            )
            this.transferOngoing = false
            return
          }
        }

        let payment
        this.$store.commit("setRequestLoadingAfterCreds", true)
        try {
          payment = await this.selectedRecipient.transfer(
            this.amount.toString(),
            this.message
          )
        } catch (err: any) {
          if (err instanceof LokapiExc.PaymentConfirmationMissing) {
            this.$modal.args.value[0].refreshTransaction()
            this.close()
            this.$msg.warning(
              this.$gettext(
                "The transaction was sent but no confirmation was received. "
              ) +
                "<br/>" +
                this.$gettext(
                  "Please make sure to double check in the transaction list " +
                    "if this transaction appears in the near future. "
                ) +
                "<br/>" +
                this.$gettext(
                  "Contact your administrator if it fails to show up."
                ),
              false
            )
            return
          }
          if (err instanceof LokapiExc.InsufficientBalance) {
            this.errors = this.$gettext(
              "Transaction was refused due to insufficient balance"
            )
            return
          }
          if (err instanceof LokapiExc.InactiveAccount) {
            this.$msg.error(
              this.$gettext("Target account is inactive.") +
                "<br/>" +
                this.$gettext("You can't send money to this account.")
            )
            return
          }
          if (err.message === "User canceled the dialog box") {
            // A warning message should have already been sent
            return
          }
          this.$msg.error(
            this.$gettext(
              "An unexpected issue occurred during the money transfer. " +
                "We are sorry for the inconvenience."
            ) +
              "<br/>" +
              this.$gettext(
                "You can try again. If the issue persists, " +
                  "please contact your administrator."
              )
          )

          console.error("Payment failed:", err)
          return
        } finally {
          this.transferOngoing = false
          this.$store.commit("setRequestLoadingAfterCreds", false)
          this.$loading.hide()
        }

        this.errors = false
        this.$modal.args.value[0].refreshTransaction()
        this.close()
        this.$modal.open("ConfirmPaymentModal", {
          transaction: payment,
          type: "reconversion",
        })
        await this.$store.dispatch("fetchAccounts")
      },
      close() {
        this.amount = 0
        this.$modal.close()
      },
      setFocus(refLabel: string) {
        this.$nextTick(() => {
          const ref = this.$refs[refLabel]
          ref.focus()
          ref.select()
        })
      },
    },
  })
  export default class MoneyReconversionModal extends Vue {}
</script>
<style lang="scss" scoped>
  @import "@/assets/custom-variables";

  .search-area {
    background: #f0faf9;
  }
  .button.action {
    white-space: normal;
    height: auto;
  }
  .card-recipient-wrapper {
    width: 90%;
  }
  .favorit-icon-wrapper {
    width: 10%;
  }
  .modal-card-body {
    min-height: 120px;
  }
  .loader-container {
    position: relative;
    height: 80px;
  }
  .amount-currency-symbol {
    margin: auto;
    font-size: 1.25em;
    font-weight: bold;
    line-height: 1em;
    padding-bottom: calc(0.5em - 1px);
    padding-left: calc(0.75em - 1px);
    padding-right: calc(0.75em - 1px);
    padding-top: calc(0.5em - 1px);
  }
  .w-100 {
    width: 100%;
  }
  .custom-search-bar {
    margin: auto;
  }
  .search-bar-container {
    width: 75%;
  }
  .qrcode-icon {
    font-size: 1.5em;
    opacity: 0.8;
    padding: 0.1em;
    border: 0.2em solid #e8e8e8;
    border-radius: 5px;
  }
  .custom-search-bar input {
    background: #ffffff;
    border: 1px solid #e8e8e8;
    border-radius: 24px;
    width: 100% !important;
  }

  .custom-pictogram-search svg {
    width: 24px !important;
    height: 24px !important;
  }

  .custom-pictogram-search path,
  rect {
    fill: $color-2 !important;
    background: $color-2 !important;
  }

  .custom-button-pictogram {
    background-color: inherit !important;
    border: none;
    cursor: pointer;
  }
  .qrcode-container {
    width: fit-content;
    margin: auto;
  }
</style>
