<template>
  <div class="recipient-info">
    <div v-if="userAccount._obj">
      <div class="item mb-2">
        <div class="title-card">
          {{ $gettext("General user account info") }}
        </div>
        <RecipientItem :recipient="recipient" />

        <div class="mt-2">
          <a
            @click="
              $modal.open('RecipientTechnicalDetailsModal', {
                componentName: 'RecipientTechnicalDetails',
                params: { recipient },
              })
            "
            class="button is-default is-rounded"
          >
            {{ $gettext("Show more info") }}
          </a>
          <a
            @click="
              $modal.open('TransactionListModal', {
                params: { account: userAccount },
              })
            "
            class="button is-default is-rounded ml-2"
          >
            {{ $gettext("Show transactions") }}
          </a>
        </div>
      </div>
      <div class="item mb-2">
        <div class="title-card">
          {{ $gettext("User account") }}
        </div>

        <div class="bank-account-item">
          <BankAccountItem
            :account="userAccount"
            :showSubAccounts="true"
            :disableDropDown="false"
            :isAccountSelected="true"
          >
            <template v-slot:name>{{
              userAccount.name ? userAccount.name() : $gettext("Unavailable")
            }}</template>
          </BankAccountItem>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import BankAccountItem from "./BankAccountItem.vue"
  import RecipientItem from "@/components/RecipientItem.vue"
  import { replaceOrInsertElt } from "@/services/lokapiService"
  import { UIError } from "../exception"

  import applyDecorators from "@/utils/applyDecorators"
  import { showSpinnerMethod } from "@/utils/showSpinner"

  const isFulfilled = <T>(
    p: PromiseSettledResult<T>
  ): p is PromiseFulfilledResult<T> => p.status === "fulfilled"

  @Options({
    name: "RecipientInfo",
    data() {
      return {
        userAccount: {},
      }
    },
    components: {
      BankAccountItem,
      RecipientItem,
    },
    props: {
      recipient: Object,
    },
    async mounted() {
      try {
        this.userAccount = await this.getAccount()
      } catch (err: any) {
        throw new UIError(
          this.$gettext(
            "An error occured while retrieving account information"
          ),
          err
        )
      }
    },
    methods: {
      getAccount: applyDecorators(
        [showSpinnerMethod(".recipient-info")],
        async function (this: any) {
          const virtualAccountTree: any[] = []
          const sortOrder = (a: any, b: any) =>
            `${a.backend}${a.name}` < `${b.backend}${b.name}` ? -1 : 1
          const userAccount = await this.$lokapi.getUserAccountsFromWalletUri(
            this.recipient.internalId
          )

          let vals: any[] = await Promise.allSettled([
            this.$lokapi.getBankAccountName(userAccount),
            userAccount.getBalance
              ? userAccount.getBalance("pending").catch((e: any) => e)
              : "-.---,--",
            userAccount.getSymbol
              ? userAccount.getSymbol().catch((e: any) => e)
              : "",
            userAccount.getAccounts().catch((e: any) => e),
            userAccount.isBusinessForFinanceBackend().catch((e: any) => e),
            userAccount.isActiveAccount
              ? userAccount.isActiveAccount().catch((e: any) => e)
              : true,
          ])
          vals = vals.filter(isFulfilled).map((v) => v.value)
          const exceptions = vals.filter((v) => v instanceof Error)
          const accountErrors: any[] = []
          if (exceptions.length > 0) {
            for (const exception of exceptions) {
              if (accountErrors.every((e) => e !== exception)) {
                accountErrors.push(exception)
              }
            }
            for (const exception of accountErrors) {
              console.log(`Exception: ${exception}`)
            }
            throw Error("Failed to retrieve bank account from user account")
          }

          const [
            name,
            bal,
            curr,
            moneyAccounts,
            isBusinessForFinanceBackend,
            isActiveAccount,
          ] = vals
          const userAccountData = {
            name,
            bal,
            curr,
            backend: userAccount.internalId.split(":")[0],
            minCreditAmount: userAccount.parent.minCreditAmount,
            maxCreditAmount: userAccount.parent.maxCreditAmount,
            userAccountId: userAccount.internalId,
            currencyId: userAccount.parent.internalId,
            isBusinessForFinanceBackend,
            active: userAccount.active, // FTM only the UserAccount is active or not
            isActiveAccount,
            id: userAccount.internalId,
            isTopUpAllowed: userAccount.isTopUpAllowed,
            subAccounts: [],
            _obj: userAccount,
            creditable: false,
            isVirtualRoot: false,
            administrativeBackendId: this.recipient.id,
          }

          await Promise.allSettled(
            (moneyAccounts || []).map(async (account: any) => {
              const vals = await Promise.allSettled([
                this.$lokapi.getBankAccountName(account),
                account.getBalance("pending"),
                account.getSymbol(),
                account.isBusinessForFinanceBackend(),
                userAccount.isActiveAccount
                  ? userAccount.isActiveAccount()
                  : Promise.resolve(true),
              ])
              const [
                name,
                bal,
                curr,
                isBusinessForFinanceBackend,
                isActiveAccount,
              ] = vals.map((a) => (<any>a).value)
              const accountData = {
                name,
                bal,
                curr,
                backend: account.parent.internalId.split(":")[0],
                minCreditAmount: account.parent.parent.minCreditAmount,
                maxCreditAmount: account.parent.parent.maxCreditAmount,
                userAccountId: account.parent.internalId,
                currencyId: account.parent.parent.internalId,
                active: account.parent.active, // FTM only the UserAccount is active or not
                isActiveAccount: isActiveAccount,
                id: account.internalId,
                isTopUpAllowed: userAccount.isTopUpAllowed,
                _obj: account,
                creditable: account.creditable,
                isBusinessForFinanceBackend:
                  userAccountData.isBusinessForFinanceBackend
                    ? false
                    : isBusinessForFinanceBackend,
                isBarter: account.isBarter,
                isVirtualRoot: false,
                administrativeBackendId: this.recipient.id,
              }
              if (moneyAccounts.length === 1) {
                // replace the userAccount
                accountData.id = userAccountData.id
                accountData.isVirtualRoot = true
                replaceOrInsertElt(
                  virtualAccountTree,
                  accountData,
                  (a: any) => userAccountData.id === a.id,
                  sortOrder
                )
              } else {
                // Add as subAccounts
                replaceOrInsertElt(
                  userAccountData.subAccounts,
                  accountData,
                  (a: any) => account.internalId === a.id,
                  sortOrder
                )
              }
            })
          )

          if (moneyAccounts && moneyAccounts.length !== 1) {
            userAccountData.isVirtualRoot = true
            replaceOrInsertElt(
              virtualAccountTree,
              userAccountData,
              (a: any) => userAccount.internalId === a.id,
              sortOrder
            )
          }

          return virtualAccountTree[0]
        }
      ),
    },
  })
  export default class RecipientInfo extends Vue {}
</script>
<style lang="scss" scoped>
  @import "../assets/custom-variables";
  .recipient-info {
    background-color: white;
    overflow-wrap: break-word;
  }
  .title-card {
    font-size: 1em;
    font-weight: bold;
  }
</style>
