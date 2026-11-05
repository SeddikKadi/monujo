<template>
  <div class="notification is-danger is-light" v-if="hasLoadingError">
    <p class="mb-4">
      {{
        $gettext(
          "An unexpected issue occurred while loading the " +
            "top up request list. Sorry for the inconvenience"
        )
      }}
    </p>
    <p>
      {{
        $gettext(
          "You can try to refresh the page, if the issue " +
            "persists, you may want to contact your " +
            "administrator"
        )
      }}
    </p>
  </div>
  <div v-else>
    <div class="section-card transactions">
      <h2 class="custom-card-title title-card">
        {{ $gettext("Top up requests waiting for approval") }}
      </h2>

      <TransactionItem
        v-for="transaction in topUpsPendingForApproval"
        :key="transaction.jsonData.odoo.credit_id"
        :transaction="transaction"
        type="topUpsPendingForApproval"
        @refreshTransaction="refreshTransaction"
        @refreshAccounts="refreshAccounts"
      />
    </div>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { UIError } from "@/exception"
  import { showSpinnerMethod } from "@/utils/showSpinner"
  import applyDecorators from "@/utils/applyDecorators"

  import TransactionItem from "@/components/TransactionItem.vue"

  @Options({
    name: "PendingCredits",
    components: {
      TransactionItem,
    },
    props: {
      refreshToggle: Boolean,
      adminWallet: Object,
    },
    emits: ["hasCredits"],
    data() {
      return {
        hasLoadingError: false,
        loadVersion: 0,
        topUpsPendingForApproval: [],
      }
    },
    async mounted() {
      await this.updatePendingCreditRequests()
    },
    watch: {
      refreshToggle() {
        this.updatePendingCreditRequests()
      },
    },
    methods: {
      updatePendingCreditRequests: applyDecorators(
        [showSpinnerMethod(".transactions")],
        async function (this: any): Promise<void> {
          const version = ++this.loadVersion
          try {
            const credits = await this.adminWallet.getCreditRequests()
            if (version !== this.loadVersion) return
            this.topUpsPendingForApproval = credits
            this.hasLoadingError = false
          } catch (err: any) {
            if (version !== this.loadVersion) return
            this.topUpsPendingForApproval = []
            console.error("Failed to fetch pending credit requests", err)
            this.hasLoadingError = true
            throw new UIError(
              this.$gettext(
                "An unexpected issue occurred while updating the pending accounts list"
              ),
              err
            )
          }
          this.$emit("hasCredits", this.topUpsPendingForApproval.length > 0)
        }
      ),
      refreshTransaction() {
        this.updatePendingCreditRequests()
        this.$emit("refreshTransaction")
      },
      refreshAccounts() {
        this.$emit("refreshAccounts")
      },
    },
  })
  export default class PendingCredits extends Vue {}
</script>
<style scoped lang="sass"></style>
