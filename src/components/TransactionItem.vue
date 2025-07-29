<template>
  <div
    class="p-3 shadow-bottom tx-item"
    :class="{
      highlight: transaction.isReconversion || transaction.isTopUp,
      cm: transaction.tags && transaction.tags.includes('barter'),
      'mode-small': mode === 'small',
      'cursor-pointer': mode !== 'small',
    }"
    @click="openModal()"
  >
    <div class="transaction-related">
      <template v-if="mode !== 'small'">
        <div
          v-if="transaction.isTopUp || transaction.isReconversion"
          class="custom-card-type"
        >
          {{
            transaction.isTopUp ? $gettext("Top-up") : $gettext("Reconversion")
          }}
        </div>
        <div v-else class="custom-card-related">
          {{ transaction.related }}
        </div>
      </template>
      <div v-if="mode === 'small'" class="custom-card-related related small">
        {{ transaction.related }}
      </div>
    </div>

    <div class="transaction-amount">
      <h3
        :class="[
          transaction.amount.toString().charAt(0) == '-'
            ? 'custom-card-related has-text-danger'
            : 'custom-card-related has-text-success',
        ]"
      >
        <div class="amount">
          <span class="amount">
            {{ numericFormat(parseFloat(transaction.amount)) }}
          </span>
        </div>
        <div class="currency">{{ transaction.currency }}</div>
      </h3>
    </div>

    <div class="transaction-date card-paiement-defaut-carte">
      <h4 v-if="mode !== 'small' && transaction.date" class="mt-1 status">
        {{ dateFormat(transaction.date) }}
      </h4>
    </div>

    <div class="transaction-relative-date">
      <h5
        v-if="transaction?.pending !== null || transaction?.date !== null"
        class="status card-paiement-defaut-carte has-text-right mt-1"
      >
        <span v-if="transaction.date">
          {{ relativeDateFormat(transaction.date) }}
        </span>
        <fa-icon
          :class="{
            hide:
              transaction?.pending === true || transaction?.pending === null,
          }"
          icon="check"
          class="fa-thin ml-1"
        />
      </h5>
    </div>
    <div
      v-if="
        mode !== 'small' &&
        $config.disableReconversionStatusDisplay !== true &&
        transaction.isReconversion
      "
      class="center"
    >
      <div class="status-label">{{ reconversionStatus }}</div>
      <div class="status-indicator">
        <WorkflowIndicator
          format="small"
          :stages="reconversionStatuses"
          :current="reconversionStatus"
        />
      </div>
    </div>
    <div v-if="transaction.description" class="transaction-desc">
      {{
        transaction.description
      }}
      sjkdbskjbdaakjdbsakjbdjskabdsjbdjsbkdjabskdbakdbsakj
    </div>
  </div>
</template>

<script lang="ts">
  import { mapGetters } from "vuex"
  import { mapModuleState } from "@/utils/vuex"
  import { Options, Vue } from "vue-class-component"

  import WorkflowIndicator from "./WorkflowIndicator.vue"
  @Options({
    name: "TransactionItem",
    components: {
      WorkflowIndicator,
    },
    props: {
      transaction: Object,
      mode: Object,
      account: Object,
      type: String,
    },
    created() {
      this.reconversionStatusTranslations = {
        true: this.$gettext("sent"),
        received: this.$gettext("received"),
        invoiced: this.$gettext("invoiced"),
        paid: this.$gettext("processed"),
      }
      this.reconversionStatuses = [true, "received", "invoiced", "paid"]
        .map((v) => this.reconversionStatusTranslations[v.toString()])
        .join("|")
    },
    computed: {
      ...mapGetters(["numericFormat", "relativeDateFormat", "dateFormat"]),
      ...mapModuleState("lokapi", ["userProfile"]),

      reconversionStatus() {
        return this.reconversionStatusTranslations[
          this.transaction?.isReconversion.toString()
        ]
      },
    },
    methods: {
      async openModal() {
        const type =
          this.type ||
          (this.transaction.isReconversion
            ? "reconversion"
            : this.transaction.isTopUp
            ? "topup"
            : "transactionDetail")

        await this.$modal.open("ConfirmPaymentModal", {
          transaction: this.transaction,
          type: type,
          account: this.account,
          refreshTransaction: this.refreshTransaction,
          refreshAccounts: this.refreshAccounts,
        })
      },
      refreshTransaction() {
        this.$emit("refreshTransaction")
      },
      refreshAccounts() {
        this.$emit("refreshAccounts")
      },
    },
  })
  export default class TransactionItem extends Vue {}
</script>
<style lang="scss" scoped>
  @import "../assets/custom-variables.scss";
  h4.custom-card-related {
    min-height: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .transaction-desc {
    grid-area: desc;
    word-wrap: break-word;
    overflow-wrap: break-word;
    width: 100%;
    margin-top: 0.7rem;
  }
  .card-paiement-defaut-carte {
    font-style: normal;
    font-weight: normal;
    line-height: 16px;
    color: rgba(53, 53, 53, 0.64);
  }
  .custom-card-related {
    font-size: 1.2rem;
    line-height: 1.5rem;
    width: auto !important;
  }
  .custom-card-type {
    font-size: 1.2rem;
    line-height: 1.5rem;
    font-style: italic;
    opacity: 0.8;
    width: auto !important;
  }
  .custom-line-separator {
    display: flex;
    height: 2px;
  }
  .status .fa-check {
    color: $color-2;
  }

  .mode-small .status {
    font-size: 0.8em;
    padding-bottom: 0.2em;
  }
  .shadow-bottom {
    box-shadow: 0 3px 6px -6px black;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .highlight {
    background-color: $inner-card-background-color;
    margin-top: 3px;
    border-radius: 1em;
  }

  .tx-item {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "related amount"
      "date    relative-date"
      "desc    desc";
    gap: 0 1em;
    align-items: center;
    position: relative;

    &.mode-small {
      padding: 0.2em !important;
      align-items: start;
      .transaction-date {
        display: none;
      }
      .transaction-related {
        text-align: left;
        padding-left: 1em;
      }
    }
    &.cm .transaction-amount .amount {
      background-color: $barter-bg-color;
    }
  }

  .transaction-related {
    grid-area: related;
    min-width: 0;
    font-weight: 400;
  }

  .transaction-amount {
    grid-area: amount;
    font-weight: 600;
    font-size: 1.2rem;
    line-height: 1.5rem;

    h3 {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .amount {
      display: inline;
      border-radius: 1em;
      padding: 0em 0.2em;
      font-weight: 400;
      font-size: 1.35rem;
      line-height: 1.5rem;
    }
    .currency {
      display: inline;
      padding-left: 0.2em;
      font-weight: 400;
      font-size: 1.4rem;
      line-height: 1.5rem;
    }
  }

  .transaction-date {
    grid-area: date;
    align-self: end;
  }

  .transaction-relative-date {
    grid-area: relative-date;
    align-self: end;
  }

  .center {
    grid-area: 1 / 1 / 3 / 3;
    justify-self: center;
    align-self: center;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);

    .status-label {
      line-height: 1.2em;
      font-weight: bold;
      text-align: center;
      color: $color-2;
    }
    .status-indicator {
      line-height: 1.5em;
      text-align: center;
    }
  }

  h3.custom-card-related {
    text-align: left;
  }
</style>
