<template>
  <div class="container">
    <div class="item mb-2">
      <div class="title-card">
        {{ $gettext("General user account info") }}
      </div>
      <div class="recipient-actions-row">
        <div class="recipient-item">
          <RecipientItem
            :recipient="recipient"
            :refreshToggle="refreshToggle"
          />
        </div>
        <div class="recipient-dropdown">
          <DropdownMenu :object="recipient" />
        </div>
      </div>
    </div>
    <div class="item mb-4">
      <div class="title-card">
        {{ $gettext("User account") }}
      </div>
      <loading
        v-if="!isUserAccountLoaded"
        :active="true"
        :can-cancel="false"
        :is-full-page="false"
        class="loader-container"
      />
      <div v-if="isUserAccountLoaded" class="bank-account-item">
        <BankAccountItem
          :account="userAccount"
          :showSubAccounts="true"
          :disableDropDown="false"
          :isAccountSelected="true"
          :refreshToggle="refreshToggle"
          showInactiveAccountBalance="true"
        >
          <template v-slot:name>{{
            userAccount.name ? userAccount.name() : $gettext("Unavailable")
          }}</template>
        </BankAccountItem>
      </div>
    </div>

    <div class="title-card">
      {{ $gettext("Account actions") }}
    </div>
    <loading
      v-if="!isAccountFormLoaded"
      :active="true"
      :can-cancel="false"
      :is-full-page="false"
      class="loader-container"
    />
    <div
      v-if="isAccountFormLoaded && Object.keys(accountForm).length > 0"
      class="item mb-2"
    >
      <div class="section-card">
        <form @submit.prevent>
          <div v-if="hasDesync" class="field account-action-row">
            <div
              class="
                notification
                is-danger is-light is-size-6
                account-type-warning
              "
            >
              <strong>{{ $gettext("Warning:") }}</strong
              >{{ " " }}
              <span class="desync-title">{{
                $gettext("The administrative backend is not up to date.")
              }}</span>
              <div v-if="canFixDesync" class="mt-2">
                <span class="is-size-7">{{ $gettext("Can be updated:") }}</span>
                <ul class="desync-list is-size-7">
                  <li v-for="d in fixableDesyncFields" :key="d.field">
                    {{ d.field }}: {{ d.odooValue }} → {{ d.comchainValue }}
                  </li>
                </ul>
                <div class="has-text-right">
                  <button
                    class="button is-danger is-outlined is-rounded sync-button"
                    @click="handleFixDesync"
                  >
                    {{ $gettext("Update") }}
                  </button>
                </div>
              </div>
              <div v-if="unfixableDesyncFields.length > 0" class="mt-2">
                <span class="is-size-7">{{
                  $gettext("Requires higher permissions:")
                }}</span>
                <ul class="desync-list is-size-7">
                  <li v-for="d in unfixableDesyncFields" :key="d.field">
                    {{ d.field }}: {{ d.odooValue }} → {{ d.comchainValue }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="field account-action-row">
            <label class="account-action-label">{{
              $gettext("Account type:")
            }}</label>
            <div class="control account-action-control">
              <DropdownButton
                v-if="canChangeAccountType"
                :options="accountTypeDropdownOptions"
                v-model="accountForm.accountType"
              />
              <DropdownButton
                v-else
                :options="[
                  {
                    value: accountForm.accountType,
                    label: currentAccountTypeLabel,
                  },
                ]"
                :modelValue="accountForm.accountType"
                :disabled="true"
              />
            </div>
          </div>
          <div
            v-if="accountTypeWarnings.length > 0"
            class="field account-action-row"
          >
            <div
              class="
                notification
                is-warning is-light is-size-6
                account-type-warning
              "
            >
              <strong>{{ $gettext("Warning:") }}</strong
              >{{ " " }}
              <span
                v-if="accountTypeWarnings.includes('set-admin-irreversible')"
              >
                {{
                  $gettext(
                    "Setting an account to Admin is irreversible on this currency."
                  )
                }}
              </span>
              <span
                v-if="accountTypeWarnings.includes('set-admin-locks-limits')"
              >
                {{
                  $gettext(
                    "Admin accounts cannot have their credit limits modified."
                  )
                }}
              </span>
            </div>
          </div>
          <div class="field account-action-row">
            <label class="account-action-label">{{
              $gettext("Account status: ")
            }}</label>
            <div class="is-flex is-align-items-center account-action-control">
              <label class="switch mr-2">
                <input
                  type="checkbox"
                  v-model="accountForm.status"
                  :disabled="!canChangeStatus"
                />
                <span class="slider round"></span>
              </label>
              <span class="has-text-weight-medium">
                {{
                  accountForm.status
                    ? $gettext("Enabled")
                    : $gettext("Disabled")
                }}
              </span>
            </div>
          </div>
          <div class="field account-action-row account-action-column">
            <label class="account-action-label barter-label">{{
              $gettext("Mutual credit balance limits:")
            }}</label>
            <div class="currency-limit-fields ml-4">
              <div class="field currency-limit-field">
                <label class="currency-limit-label">
                  {{ $gettext("Maximum allowed") }}
                </label>
                <div class="currency-limit-input">
                  <div class="control has-suffix">
                    <input
                      class="input"
                      :class="{ 'is-danger': negativeLimitError }"
                      type="text"
                      inputmode="decimal"
                      v-model="accountForm.highLimit"
                      :disabled="!canChangeLimits"
                      @blur="formatLimitField('highLimit')"
                    />
                    <span class="input-suffix">{{ userAccount.curr }}</span>
                  </div>
                  <div v-if="negativeLimitError" class="help is-danger">
                    {{ negativeLimitError }}
                  </div>
                </div>
              </div>
              <div class="field currency-limit-field">
                <label class="currency-limit-label">
                  {{ $gettext("Minimum allowed") }}
                </label>
                <div class="currency-limit-input">
                  <div class="control has-suffix">
                    <input
                      class="input"
                      :class="{ 'is-danger': positiveLimitError }"
                      type="text"
                      inputmode="decimal"
                      v-model="accountForm.lowLimit"
                      :disabled="!canChangeLimits"
                      @blur="formatLimitField('lowLimit')"
                    />
                    <span class="input-suffix">{{ userAccount.curr }}</span>
                  </div>
                  <div v-if="positiveLimitError" class="help is-danger">
                    {{ positiveLimitError }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import BankAccountItem from "./BankAccountItem.vue"
  import RecipientItem from "@/components/RecipientItem.vue"
  import { isAmountTooLarge, hasExcessDecimals } from "@/utils/amount"
  import { UIError } from "../exception"
  import { showSpinnerMethod } from "@/utils/showSpinner"
  import applyDecorators from "@/utils/applyDecorators"
  import DropdownButton from "./DropdownButton.vue"
  import DropdownMenu from "@/components/DropdownMenu.vue"
  import Loading from "vue-loading-overlay"
  import "vue-loading-overlay/dist/css/index.css"

  @Options({
    name: "RecipientInfo",
    data() {
      return {
        userAccount: {},
        option: null,
        accountTypes: [],
        accountForm: {},
        initialAccountForm: {},
        capabilities: {
          accountType: { editable: false, warnings: [] as string[] },
          limits: { editable: false },
          status: { editable: false },
        },
        desyncedFields: [] as {
          key: string
          field: string
          odooValue: string
          comchainValue: string
          fixable: boolean
        }[],
        isSyncing: false,
        refreshToggle: false,
        isUserAccountLoaded: false,
        isAccountFormLoaded: false,
      }
    },
    components: {
      BankAccountItem,
      RecipientItem,
      DropdownButton,
      DropdownMenu,
      Loading,
    },
    emits: ["accountFormChange"],
    props: {
      recipient: Object,
      currency: Object,
    },
    async mounted() {
      await this.refreshAll()
    },
    computed: {
      canChangeAccountType() {
        return this.capabilities.accountType.editable
      },
      canChangeLimits() {
        return this.capabilities.limits.editable
      },
      canChangeStatus() {
        console.log(`Called canChangeStatus`, this.capabilities.status.editable)
        return this.capabilities.status.editable
      },
      accountTypeWarnings() {
        return this.capabilities.accountType.warnings || []
      },
      hasDesync() {
        return this.desyncedFields.length > 0 && !this.isSyncing
      },
      fixableDesyncFields() {
        return this.desyncedFields.filter((d: any) => d.fixable)
      },
      unfixableDesyncFields() {
        return this.desyncedFields.filter((d: any) => !d.fixable)
      },
      canFixDesync() {
        return this.fixableDesyncFields.length > 0
      },
      currentAccountTypeLabel() {
        const labels: Record<string, string> = {
          professional: this.$gettext("Professional"),
          personal: this.$gettext("Personal"),
          admin: this.$gettext("Admin"),
          pledgeAdmin: this.$gettext("Pledge admin"),
          propertyAdmin: this.$gettext("Property admin"),
        }
        return (
          labels[this.accountForm.accountType] || this.accountForm.accountType
        )
      },
      isAccountFormChanged() {
        return (
          this.accountForm.status !== this.initialAccountForm.status ||
          this.accountForm.accountType !==
            this.initialAccountForm.accountType ||
          this.parseLimitValue(this.accountForm.highLimit) !==
            this.parseLimitValue(this.initialAccountForm.highLimit) ||
          this.parseLimitValue(this.accountForm.lowLimit) !==
            this.parseLimitValue(this.initialAccountForm.lowLimit)
        )
      },
      accountTypeDropdownOptions() {
        const labels: Record<string, string> = {
          professional: this.$gettext("Professional"),
          personal: this.$gettext("Personal"),
          admin: this.$gettext("Admin"),
          pledgeAdmin: this.$gettext("Pledge admin"),
          propertyAdmin: this.$gettext("Property admin"),
        }
        return this.accountTypes.map((type: string) => ({
          value: type,
          label: labels[type] || type,
        }))
      },
      negativeLimitError() {
        const value = this.parseLimitValue(this.accountForm.highLimit)
        if (value === null || value < 0) {
          return this.$gettext("Maximum limit must be zero or greater.")
        }
        if (isAmountTooLarge(value)) {
          return this.$gettext("Value is too large.")
        }
        if (hasExcessDecimals(String(this.accountForm.highLimit))) {
          return this.$gettext("Value must not have more than 2 decimals.")
        }
        return false
      },
      positiveLimitError() {
        const value = this.parseLimitValue(this.accountForm.lowLimit)
        if (value === null || value > 0) {
          return this.$gettext("Minimum limit must be zero or less.")
        }
        if (isAmountTooLarge(value)) {
          return this.$gettext("Value is too large.")
        }
        if (hasExcessDecimals(String(this.accountForm.lowLimit))) {
          return this.$gettext("Value must not have more than 2 decimals.")
        }
        return false
      },
    },
    watch: {
      accountForm: {
        handler() {
          if (Object.keys(this.accountForm).length > 0) {
            this.emitAccountFormChange()
          }
        },
        deep: true,
      },
    },
    methods: {
      async refreshAll() {
        if (this.userAccount?._obj?.refresh) {
          await this.userAccount._obj.refresh(this.currency)
        } else if (this.userAccount?._obj?.clearCaches) {
          this.userAccount._obj.clearCaches()
        }
        await Promise.all([this.refreshAccounts(), this.fetchAccountTypes()])
        this.isUserAccountLoaded = true
        await this.initializeAccountForm()
        await this.fetchCapabilities()
        this.isAccountFormLoaded = true
        this.refreshToggle = !this.refreshToggle
      },
      handleFixDesync: applyDecorators(
        [showSpinnerMethod(".section-card")],
        async function (this: any): Promise<void> {
          this.isSyncing = true
          try {
            const comchain = this.initialAccountForm
            const odoo = this.userAccount._obj.comchainMirroredState
            const fixableKeys = new Set(
              this.fixableDesyncFields.map((d: any) => d.key)
            )
            const pick = (key: string) =>
              fixableKeys.has(key) ? comchain[key] : odoo[key]
            await this.recipient.updateAccountForAdministrativeBackend({
              accountType: pick("accountType"),
              status: pick("status"),
              highLimit: pick("highLimit"),
              lowLimit: pick("lowLimit"),
            })
            await this.refreshAll()
            this.$msg.success(
              this.$gettext("Administrative backend successfully synchronized")
            )
          } catch (err: any) {
            this.$msg.error(
              this.$gettext("An error occurred while synchronizing")
            )
            console.error(err)
          } finally {
            this.isSyncing = false
          }
        }
      ),
      async fetchCapabilities() {
        try {
          this.capabilities = await this.recipient.getAccountEditCapabilities()
        } catch (err: any) {
          console.error("Failed to fetch account edit capabilities", err)
        }
        console.log(`capabilities:`, this.capabilities)
        this.emitAccountFormChange()
      },
      async fetchAccountTypes() {
        this.accountTypes =
          await this.recipient.fromUserAccount.getEditableAccountTypeLabels()
        if (!this.accountForm.accountType && this.accountTypes.length > 0) {
          this.accountForm.accountType = this.accountTypes[0]
        }
      },
      async fetchMutualCreditLimits() {
        let cmAccount = this.userAccount.subAccounts?.find(
          (acc: any) => acc._obj.type === "Cm"
        )
        // Single money account replaces the parent — no subAccounts
        if (!cmAccount && this.userAccount._obj?.type === "Cm") {
          cmAccount = this.userAccount
        }
        let highLimit, lowLimit

        if (cmAccount) {
          try {
            highLimit = await cmAccount._obj.getHighLimit()
            lowLimit = await cmAccount._obj.getLowLimit()
          } catch (err: any) {
            console.error(
              "An unexpected server error occurred while fetching mutual credit limits",
              err
            )
            this.$msg.error(
              this.$gettext(
                "An unexpected server error occurred while fetching mutual credit limits"
              )
            )
          }
        }
        return { highLimit, lowLimit }
      },
      async initializeAccountForm() {
        const accountType = await this.userAccount._obj.getTypeLabel()
        const status = !!this.userAccount.isActiveAccount

        let { highLimit, lowLimit } = await this.fetchMutualCreditLimits()
        highLimit = this.formatLimitValue(highLimit)
        lowLimit = this.formatLimitValue(lowLimit)
        let form = {
          status,
          accountType,
          highLimit,
          lowLimit,
        }
        this.initialAccountForm = { ...form }
        this.accountForm = form

        const mirrorState = this.userAccount._obj.comchainMirroredState
        const accountTypeLabels: Record<string, string> = {
          professional: this.$gettext("Professional"),
          personal: this.$gettext("Personal"),
          admin: this.$gettext("Admin"),
          pledgeAdmin: this.$gettext("Pledge admin"),
          propertyAdmin: this.$gettext("Property admin"),
        }
        const formatStatus = (v: boolean) =>
          v ? this.$gettext("Enabled") : this.$gettext("Disabled")
        const formatLimit = (v: any) =>
          v === null || v === undefined ? "—" : String(v)

        const canFixAccountType = this.accountTypes.includes(accountType)
        const checks = [
          {
            key: "accountType",
            field: this.$gettext("Account type"),
            odooRaw: mirrorState.accountType,
            comchainRaw: accountType,
            odooValue:
              accountTypeLabels[mirrorState.accountType] ||
              mirrorState.accountType,
            comchainValue: accountTypeLabels[accountType] || accountType,
            fixable: canFixAccountType,
          },
          {
            key: "status",
            field: this.$gettext("Account status"),
            odooRaw: mirrorState.status,
            comchainRaw: status,
            odooValue: formatStatus(mirrorState.status),
            comchainValue: formatStatus(status),
            fixable: this.capabilities.status.editable,
          },
          {
            key: "highLimit",
            field: this.$gettext("Maximum limit"),
            odooRaw: mirrorState.highLimit,
            comchainRaw: this.parseLimitValue(highLimit),
            odooValue: formatLimit(mirrorState.highLimit),
            comchainValue: formatLimit(highLimit),
            fixable: true, // Administrative backend can be fixed
          },
          {
            key: "lowLimit",
            field: this.$gettext("Minimum limit"),
            odooRaw: mirrorState.lowLimit,
            comchainRaw: this.parseLimitValue(lowLimit),
            odooValue: formatLimit(mirrorState.lowLimit),
            comchainValue: formatLimit(lowLimit),
            fixable: true, // Administrative backend can be fixed
          },
        ]
        this.desyncedFields = checks
          .filter((c) => c.odooRaw !== c.comchainRaw)
          .map(({ key, field, odooValue, comchainValue, fixable }) => ({
            key,
            field,
            odooValue,
            comchainValue,
            fixable,
          }))
      },

      emitAccountFormChange() {
        console.log(`emitting: canChangeStatus: ${this.canChangeStatus}`)
        this.$emit("accountFormChange", {
          form: { ...this.accountForm },
          isChanged: this.isAccountFormChanged,
          isFormValid: !this.negativeLimitError && !this.positiveLimitError,
          canChangeStatus: this.canChangeStatus,
        })
      },

      async refreshAccounts() {
        try {
          this.userAccount = await this.$lokapi.getAccountFromRecipient(
            this.recipient,
            this.currency
          )
        } catch (err: any) {
          throw new UIError(
            this.$gettext(
              "An error occured while retrieving account information"
            ),
            err
          )
        }
      },
      parseLimitValue(value: any) {
        if (value === "" || value === null || value === undefined) {
          return null
        }
        if (typeof value === "number") {
          return Number.isNaN(value) ? null : value
        }
        const parsed = Number(value)
        return Number.isNaN(parsed) ? null : parsed
      },
      formatLimitValue(value: any) {
        const parsed = this.parseLimitValue(value)
        if (parsed === null) return value
        return parsed.toFixed(2)
      },
      formatLimitField(field: string) {
        const parsed = this.parseLimitValue(this.accountForm[field])
        if (parsed !== null) {
          this.accountForm[field] = parsed.toFixed(2)
        }
      },
    },
  })
  export default class RecipientInfo extends Vue {}
</script>
<style lang="scss" scoped>
  @import "../assets/custom-variables";
  @import "@/assets/switch-prefs";
  .container {
    background-color: white;
    overflow-wrap: break-word;
  }
  .section-card {
    padding: 0.8em;
  }

  .account-action-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .account-action-label {
    margin-bottom: 0;
    white-space: nowrap;
    margin: auto;
  }

  .account-action-control {
    align-items: start;
    width: 100%;
  }

  .account-action-column {
    flex-direction: column;
    align-items: flex-start;
  }

  .currency-limit-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .currency-limit-field {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    align-items: start;
    gap: 0.5rem;
  }

  .currency-limit-input {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .currency-limit-input .input {
    text-align: right;
  }

  .control.has-suffix {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .input-suffix {
    white-space: nowrap;
    font-size: 1em;
    color: #666;
  }

  .currency-limit-label {
    margin-bottom: 0;
    width: 10rem;
    margin-top: 0.5em;
  }

  .title-card {
    font-size: 1em;
    font-weight: bold;
  }

  .recipient-actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
  }

  .barter-label {
    margin-left: 0rem;
  }

  .loader-container {
    position: relative;
    height: 80px;
  }

  .account-type-warning {
    padding: 0.5rem 0.75rem;
    width: 100%;
  }

  .sync-button {
    padding: 0.15rem 0.6rem;
    height: 2em;
    font-size: 0.9rem;
  }

  .desync-title {
    font-size: 0.9rem;
  }

  .desync-list {
    list-style: disc;
    margin-left: 1.5em;
    margin-top: 0.3em;
    margin-bottom: 0.5em;
  }
</style>
