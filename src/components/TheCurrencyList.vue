<template>
  <loading
    v-if="!adminUserAccounts.length"
    v-model:active="currenciesLoading"
    :can-cancel="false"
    :is-full-page="false"
  />
  <div class="active" v-if="!currenciesLoading || adminUserAccounts.length">
    <a
      @click="toggleRefreshBalance()"
      :title="$gettext('Refresh balance and transaction list')"
      class="button is-default is-pulled-right is-rounded refresh"
      :class="{
        'active-refresh-button': currencyRefreshing,
      }"
    >
      <span :class="{ hide: currencyRefreshing }">
        {{ $gettext("Refresh") }}
      </span>
      <span class="icon is-small">
        <fa-icon
          :class="{
            refreshing: currencyRefreshing,
          }"
          icon="sync"
        />
      </span>
    </a>
    <div class="section-card" v-if="adminUserAccounts.length !== 0">
      <h2 class="custom-card-title title-card">
        {{ $gettext("your currencies") }}
      </h2>
      <div v-for="entry in adminUserAccounts" :key="entry.userAccount.uri">
        <CurrencyItem
          class="mb-5"
          :class="{
            selected: entry.userAccount?.uri === currency?.uri,
          }"
          @currencySelected="$emit('currencySelected', entry.userAccount)"
          :isCurrencySelected="entry.userAccount?.uri === currency?.uri"
          :currency="entry.userAccount"
          :showAccountId="entry.showAccountId"
          :refreshCurrency="refreshCurrency"
          @update:currencyRefreshing="(x) => (currencyRefreshing = x)"
        >
        </CurrencyItem>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import CurrencyItem from "./CurrencyItem.vue"
  import Loading from "vue-loading-overlay"
  import "vue-loading-overlay/dist/css/index.css"

  let interval: any

  @Options({
    name: "TheCurrencyList",
    props: {
      currency: Object,
      refreshToggle: Boolean,
    },
    data() {
      return {
        currenciesLoading: true,
        currencyRefreshing: false,
        adminUserAccounts: [] as {
          userAccount: any
          showAccountId: boolean
        }[],
        refreshCurrency: false,
      }
    },
    components: {
      CurrencyItem,
      Loading,
    },
    async mounted() {
      const currenciesRefreshInterval =
        this.$config.currenciesRefreshInterval || 90

      if (currenciesRefreshInterval !== -1) {
        if (interval) clearInterval(interval)

        interval = setInterval(() => {
          this.toggleRefreshBalance()
        }, Math.max(10000, currenciesRefreshInterval * 1000))
      }
      this.adminUserAccounts = await this.getAdminUserAccounts()
      this.currenciesLoading = false
    },
    unmounted() {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    },
    computed: {},
    watch: {
      async refreshToggle(newval, oldVal): Promise<void> {
        this.adminUserAccounts = await this.getAdminUserAccounts()
        this.currencyRefreshing = true
        this.refreshCurrency = { retryUntilChange: true }
      },
    },
    methods: {
      async getAdminUserAccounts() {
        const backends = await this.$lokapi.getBackends()
        if (!backends) {
          return []
        }
        const allUserAccounts: any[] = []
        for (const backend of Object.values(backends) as any[]) {
          for (const ua of Object.values(backend.userAccounts || {}) as any[]) {
            if (!ua.getCurrencySupply) continue
            // A wallet is listed when it can act here. Being allowed to
            // search every recipient is not enough: without one of these
            // rights nothing can be done on the accounts it finds.
            if (
              (await ua.hasCreditRequestValidationRights?.()) ||
              (await ua.hasUserAccountValidationRights?.())
            ) {
              allUserAccounts.push(ua)
            }
          }
        }
        const backendCounts: Record<string, number> = {}
        for (const ua of allUserAccounts) {
          const id = ua.parent.internalId
          backendCounts[id] = (backendCounts[id] || 0) + 1
        }
        const entries = allUserAccounts.map((ua) => ({
          userAccount: ua,
          showAccountId: backendCounts[ua.parent.internalId] > 1,
        }))
        const selected =
          allUserAccounts.find((ua) => ua.uri === this.currency?.uri) ||
          allUserAccounts[0] ||
          null
        if (selected !== this.currency) this.$emit("currencySelected", selected)
        return entries
      },
      async toggleRefreshBalance() {
        this.adminUserAccounts = await this.getAdminUserAccounts()
        this.currencyRefreshing = true
        this.refreshCurrency = !this.refreshCurrency
        // Manual refresh also triggers sibling boxes on the admin dashboard:
        // - refreshAccounts -> account creation requests (PendingAccounts)
        // - refreshTransaction -> pending top-up requests (PendingCredits)
        this.$emit("refreshAccounts")
        this.$emit("refreshTransaction")
      },
    },
  })
  export default class TheCurrencyList extends Vue {}
</script>
<style lang="scss" scoped>
  @import "../assets/custom-variables.scss";

  .refresh {
    margin-top: -1.2em;
    z-index: 1;
  }
  .active-refresh-button {
    border-color: transparent;
    background-color: transparent;
    pointer-events: none;
    cursor: default;
  }
  .active-refresh-button .icon {
    color: $top-menu-link-color;
  }
</style>
