<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <template v-if="$modal.step.value == 1">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title is-title-shrink">
            {{ $gettext("Recipient Selector") }} - 1/2
          </p>
          <button
            class="delete"
            aria-label="close"
            @click="$modal.close()"
          ></button>
        </header>
        <RecipientSelector
          :showAll="true"
          purpose="inspect"
          @clickRecipient="handleClickRecipient"
          :currency="currency"
        />
        <footer class="modal-card-foot is-justify-content-flex-end"></footer>
      </div>
    </template>
    <template v-if="$modal.step.value == 2">
      <div class="modal-card" tabindex="0">
        <header class="modal-card-head">
          <span class="is-flex is-flex-shrink-0">
            <a class="mr-3 is-flex" @click="$modal.back()">
              <span class="icon has-text-white">
                <fa-icon icon="arrow-left" class="fa-lg" />
              </span>
            </a>
          </span>
          <p class="modal-card-title is-title-shrink">
            {{ $gettext("Recipient Info") }}
          </p>
          <button
            class="delete"
            aria-label="close"
            @click="$modal.close()"
          ></button>
        </header>
        <section class="modal-card-body">
          <RecipientInfo
            ref="recipientInfo"
            :recipient="recipient"
            :currency="currency"
            @accountFormChange="handleAccountFormChange"
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
            v-if="canChangeStatus"
            type="button"
            class="button is-danger is-rounded"
            @click="handleArchiveAccount"
          >
            {{ $gettext("Archive") }}
          </button>
          <button
            type="button"
            class="button is-pay is-rounded mr-2"
            @click="handleCreditMoney"
            :disabled="!isActiveAccount"
          >
            {{ $gettext("Credit money") }}
          </button>
          <button
            type="button"
            class="button is-pay is-rounded"
            :disabled="!isAccountFormChanged || !isFormValid"
            @click="handleSaveAccountChanges"
          >
            {{ $gettext("Save changes") }}
          </button>
        </footer>
      </div>
    </template>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { UIError } from "../exception"

  import { showSpinnerMethod } from "@/utils/showSpinner"
  import applyDecorators from "@/utils/applyDecorators"

  import RecipientSelector from "@/components/RecipientSelector.vue"
  import RecipientInfo from "@/components/RecipientInfo.vue"

  @Options({
    name: "InspectRecipientModal",
    components: {
      RecipientSelector,
      RecipientInfo,
    },
    data() {
      return {
        recipient: null,
        currency: null,
        accountForm: null,
        isAccountFormChanged: false,
        isFormValid: false,
        canChangeStatus: true,
        isActiveAccount: false,
      }
    },
    created() {
      const [opts] = this.$modal.args.value
      this.currency = opts.currency
    },
    methods: {
      async handleClickRecipient(data: any): Promise<void> {
        this.recipient = data.recipient
        const account = await this.$lokapi.getAccountFromRecipient(
          this.recipient,
          this.currency
        )
        this.isActiveAccount = account.isActiveAccount
        this.$modal.next()
      },

      handleAccountFormChange(payload: {
        form: Record<string, any>
        isChanged: boolean
        isFormValid: boolean
        canChangeStatus: boolean
      }) {
        this.accountForm = payload.form
        this.isAccountFormChanged = payload.isChanged
        this.isFormValid = payload.isFormValid
        this.canChangeStatus = payload.canChangeStatus
      },

      async handleArchiveAccount(this: any): Promise<void> {
        let answer
        try {
          answer = await this.$dialog.show({
            title: this.$gettext("Archive"),
            content: this.$gettext(
              "This account will no longer be visible in lists and " +
                "will no longer be accessible via Monujo. However, " +
                "this will allow the user to create a new account."
            ),
            buttons: [
              { label: this.$gettext("Archive"), id: "archive" },
              { label: this.$gettext("Cancel"), id: "cancel" },
            ],
          })
        } catch {
          return
        }
        if (answer !== "archive") return
        await this._doArchive()
      },

      _doArchive: applyDecorators(
        [showSpinnerMethod(".modal-card")],
        async function (this: any): Promise<void> {
          try {
            await this.recipient.archive()
          } catch (err: any) {
            throw new UIError(
              this.$gettext("An error occurred while archiving the account"),
              err
            )
          }
          this.$msg.success(this.$gettext("Account successfully archived"))
          this.$modal.back()
        }
      ),

      handleSaveAccountChanges: applyDecorators(
        [showSpinnerMethod(".modal-card")],
        async function (this: any): Promise<void> {
          const { status, accountType, highLimit, lowLimit } = this.accountForm
          try {
            await this.recipient.updateAccount({
              status,
              accountType,
              lowLimit,
              highLimit,
            })
          } catch (err: any) {
            throw new UIError(
              this.$gettext("An error occured while updating account"),
              err
            )
          }
          this.$msg.success(this.$gettext("Account successfully updated"))
          await (this.$refs as any).recipientInfo.refreshAll()
        }
      ),
      handleCreditMoney() {
        const recipientInfo = this.$refs.recipientInfo as any
        if (recipientInfo) {
          recipientInfo.openCreditMoney()
        }
      },
    },
  })
  export default class InspectRecipientModal extends Vue {}
</script>
<style lang="scss" scoped>
  .modal-card-body {
    min-height: 120px;
  }
</style>
