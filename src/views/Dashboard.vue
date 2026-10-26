<template>
  <section>
    <main class="main">
      <div class="container mt-5">
        <div class="columns is-tablet">
          <div class="column is-half">
            <TheBankAccountList
              @refreshTransaction="refreshTransaction"
              @accountSelected="accountSelected"
              :refreshToggle="refreshAccountsToggle"
              :account="account"
            />
          </div>
          <div class="column is-half">
            <TheTransactionList
              v-if="account"
              @refreshAccounts="refreshAccounts"
              @refreshTransaction="refreshTransaction"
              :refreshToggle="refreshTransactionsToggle"
              :account="account"
              :key="account._obj.internalId"
            />
          </div>
        </div>
      </div>
      <div class="action-footer-container">
        <div class="container">
          <TheDashboardFooter
            :account="account"
            @refreshTransaction="refreshTransaction"
            @refreshAccounts="refreshAccounts"
          />
        </div>
      </div>
    </main>
  </section>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { mapGetters } from "vuex"

  import TheBankAccountList from "@/components//TheBankAccountList.vue"
  import TheTransactionList from "@/components/TheTransactionList.vue"
  import TheDashboardFooter from "@/components/TheDashboardFooter.vue"

  @Options({
    name: "core",
    props: {
      msg: String,
    },
    data() {
      return {
        refreshTransactionsToggle: false,
        refreshAccountsToggle: false,
        refreshContractsToggle: false,
        // The selection is kept by wallet id, as refreshes rebuild the
        // accounts as new objects
        selectedAccountId: null,
        // Whether the user chose, or was given, a wallet in this session:
        // it is then never replaced by another one
        isSelectionConfirmed: false,
        isSelectionRestored: false,
      }
    },
    async created() {
      // Wallet selected in the previous session, if still available
      const settings = (await this.$localSettings.load()) || {}
      this.selectedAccountId = settings.selectedWalletId || null
      this.isSelectionRestored = true
      this.selectDefaultAccount()
    },
    computed: {
      account(): any {
        return (
          this.availableVirtualAccounts.find(
            (a: any) => a?.id === this.selectedAccountId
          ) || null
        )
      },
      ...mapGetters(["availableVirtualAccounts"]),
    },
    watch: {
      availableVirtualAccounts() {
        this.selectDefaultAccount()
      },
    },
    components: {
      TheTransactionList,
      TheBankAccountList,
      TheDashboardFooter,
    },
    methods: {
      refreshTransaction() {
        // This change is propagated through props to children components
        this.refreshTransactionsToggle = !this.refreshTransactionsToggle
        this.refreshContractsToggle = !this.refreshContractsToggle
      },
      refreshAccounts() {
        // This change is propagated through props to children components
        this.refreshAccountsToggle = !this.refreshAccountsToggle
      },
      async accountSelected(account: any) {
        this.selectedAccountId = account.id
        this.isSelectionConfirmed = true
        const settings = (await this.$localSettings.load()) || {}
        settings.selectedWalletId = account.id
        await this.$localSettings.save(settings)
      },
      /**
       * Select the first available wallet only when no wallet was chosen in
       * this session yet and the remembered one is not available: a wallet
       * that becomes unavailable is never silently replaced.
       */
      selectDefaultAccount() {
        if (!this.isSelectionRestored || this.isSelectionConfirmed) return
        if (this.account) {
          this.isSelectionConfirmed = true
          return
        }
        if (this.availableVirtualAccounts.length > 0) {
          this.accountSelected(this.availableVirtualAccounts[0])
        }
      },
    },
  })
  export default class Core extends Vue {}
</script>
<style lang="scss" scoped>
  @import "@/assets/safe-area";
  .action-footer-container {
    position: fixed !important;
    z-index: 20;
    bottom: #{$sa-bottom} !important;
    width: calc(100vw - #{$sa-left} - #{$sa-right});

    @media screen and (min-width: 1024px) {
      bottom: calc(20px + #{$sa-bottom}) !important;
    }
  }
  :deep(div.card div.section-card > p) {
    margin-left: 1em;
    margin-bottom: 0.5em;
    font-style: italic;
    color: #888;
  }
  :deep(div.card div.section-card > h2) {
    border-bottom: 1px solid black;
    padding-bottom: 0.2em;
    margin-bottom: 0.5em;
    font-weight: bold;
    color: #666;
  }
  :deep(main > div > div > div > div.card div.section-card) {
    margin-bottom: 2em;
  }
</style>
