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
      <div v-for="entry in adminUserAccounts">
        <CurrencyItem
          class="mb-5"
          :class="{
            selected: entry.userAccount?.internalId === currency?.internalId,
          }"
          @currencySelected="$emit('currencySelected', entry.userAccount)"
          :isCurrencySelected="
            entry.userAccount?.internalId === currency?.internalId
          "
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
        const backendList = Object.values(backends)

        const backendChecks = await Promise.all(
          backendList.map(async (backend: any) => {
            // Backends whose user accounts don't implement
            // getCurrencySupply are not yet fully administrable and
            // should not appear in the admin dashboard currency list.
            const userAccounts = Object.values(backend.userAccounts || {})
            if (!userAccounts.some((ua: any) => ua.getCurrencySupply)) {
              return false
            }
            return (
              (await backend.hasCreditRequestValidationRights()) ||
              (await backend.hasUserAccountValidationRights()) ||
              (await backend.canSearchAllRecipients())
            )
          })
        )
        const filteredBackendList = backendList.filter(
          (backend, index) => backendChecks[index]
        )

        // Flatten all user accounts from filtered backends
        const allUserAccounts: any[] = []
        for (const backend of filteredBackendList as any[]) {
          for (const ua of Object.values(backend.userAccounts || {})) {
            allUserAccounts.push(ua)
          }
        }

        // Detect duplicates: user accounts sharing the same
        // backend have the same currency and need disambiguation.
        const backendCounts: Record<string, number> = {}
        for (const ua of allUserAccounts) {
          const bid = (ua as any).backend?.internalId
          backendCounts[bid] = (backendCounts[bid] || 0) + 1
        }

        const entries = allUserAccounts.map((ua: any) => ({
          userAccount: ua,
          showAccountId: backendCounts[ua.backend?.internalId] > 1,
        }))

        if (!this.currency && entries.length > 0) {
          this.$emit("currencySelected", entries[0].userAccount)
        }
        return entries
      },
      async toggleRefreshBalance() {
        this.currencyRefreshing = true
        this.refreshCurrency = !this.refreshCurrency
        this.$emit("refreshAccounts")
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
