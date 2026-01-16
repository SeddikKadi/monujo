<template>
  <div
    class="modal is-active"
    v-if="$modal.modal.value == $options.name"
    ref="transactions"
  >
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title is-title-shrink">
          <span class="ml-2">{{
            modalTitle || $gettext("All transactions")
          }}</span>
        </p>
        <button
          class="delete"
          aria-label="close"
          @click="$modal.back()"
        ></button>
      </header>
      <TransactionList
        :recipient="selectedRecipient"
        :account="account"
        ref="txList"
      />
      <footer
        class="modal-card-foot custom-modal-card-foot is-justify-content-end"
      >
        <div
          class="dropdown is-up transaction-download-dropdown"
          :class="{ 'is-active': isDownloadDropdownOpen }"
          ref="downloadDropdown"
        >
          <div class="dropdown-trigger">
            <button
              class="
                button
                custom-button-modal
                has-text-weight-medium
                transaction-list-download
              "
              aria-haspopup="true"
              aria-controls="transaction-export-menu"
              :aria-expanded="isDownloadDropdownOpen"
              @click.stop="toggleDownloadDropdown"
              :disabled="isTransactionsLoading"
            >
              <span v-if="isTransactionsLoading" class="icon">
                <fa-icon
                  icon="fa-circle-notch"
                  :class="{ refreshing: isTransactionsLoading }"
                  class="fa-lg"
                />
              </span>
              <span v-else class="icon">
                <fa-icon
                  :icon="getPlatform === 'web' ? 'fa-download' : 'fa-share'"
                  class="download-icon"
                />
              </span>
              <span class="custom-card-related">{{
                getPlatform === "web" ? $gettext("Download") : $gettext("Share")
              }}</span>

              <span class="icon">
                <fa-icon
                  :icon="
                    isDownloadDropdownOpen ? 'fa-angle-down' : 'fa-angle-up'
                  "
                  class="fa-lg"
                />
              </span>
            </button>
          </div>
          <div
            class="dropdown-menu"
            id="transaction-export-menu"
            role="menu"
            @click.stop
          >
            <div class="dropdown-content">
              <span class="dropdown-item is-flex">
                <a
                  href="#"
                  class="dropdown-item-link"
                  @click.prevent="
                    getPlatform === 'web' ? downloadPdfFile() : sharePdfFile()
                  "
                >
                  <span class="icon mr-1">
                    <fa-icon icon="fa-file-pdf" class="fa-lg" />
                  </span>
                  {{
                    getPlatform === "web"
                      ? $gettext("Download PDF file")
                      : $gettext("Share PDF file")
                  }}
                </a>
              </span>
              <span class="dropdown-item is-flex">
                <a
                  href="#"
                  class="dropdown-item-link"
                  @click.prevent="
                    getPlatform === 'web' ? downloadCsvFile() : shareCsvFile()
                  "
                >
                  <span class="icon mr-1">
                    <fa-icon icon="fa-file-csv" class="fa-lg" />
                  </span>
                  {{
                    getPlatform === "web"
                      ? $gettext("Download CSV file")
                      : $gettext("Share CSV file")
                  }}
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  import { Capacitor } from "@capacitor/core"

  import TransactionList from "./TransactionList.vue"

  @Options({
    name: "TransactionListModal",
    components: {
      TransactionList,
    },

    data(this: any) {
      return {
        isTransactionsLoading: false,
        account: null,
        modalTitle: null,
        isDownloadDropdownOpen: false,
        selectedRecipient: null,
      }
    },

    created() {
      this.account = this.$modal.args.value[0].params.account
      this.modalTitle = this.$modal.args.value[0].params.title
      this.selectedRecipient = this.$modal.args.value[0].params.recipient
    },
    async mounted() {
      document.addEventListener("click", this.handleOutsideClick)
    },
    beforeUnmount() {
      document.removeEventListener("click", this.handleOutsideClick)
    },
    computed: {
      getPlatform(): string {
        return Capacitor.getPlatform()
      },
    },
    methods: {
      async downloadCsvFile() {
        this.isTransactionsLoading = true
        try {
          await (this.$refs.txList as any)?.downloadCsvFile?.()
        } finally {
          this.isTransactionsLoading = false
          this.toggleDownloadDropdown()
        }
      },
      async downloadPdfFile() {
        this.isTransactionsLoading = true
        try {
          await (this.$refs.txList as any)?.downloadPdfFile?.()
        } finally {
          this.isTransactionsLoading = false
          this.toggleDownloadDropdown()
        }
      },
      async shareCsvFile() {
        this.isTransactionsLoading = true
        try {
          await (this.$refs.txList as any)?.shareCsvFile?.()
        } finally {
          this.isTransactionsLoading = false
          this.toggleDownloadDropdown()
        }
      },

      async sharePdfFile() {
        this.isTransactionsLoading = true
        try {
          await (this.$refs.txList as any)?.sharePdfFile?.()
        } finally {
          this.isTransactionsLoading = false
          this.toggleDownloadDropdown()
        }
      },
      toggleDownloadDropdown() {
        this.isDownloadDropdownOpen = !this.isDownloadDropdownOpen
      },
      handleOutsideClick(event: MouseEvent) {
        if (!this.isDownloadDropdownOpen) {
          return
        }
        const dropdown = this.$refs.downloadDropdown as HTMLElement | undefined
        if (
          event.target instanceof Node &&
          dropdown &&
          !dropdown.contains(event.target)
        ) {
          this.toggleDownloadDropdown()
        }
      },
    },
  })
  export default class TheTransactionList extends Vue {}
</script>
<style lang="scss">
  @import "@/assets/custom-variables";

  .transaction-download-dropdown {
    margin-right: 0.35rem;

    .dropdown-item {
      display: flex;
      text-align: center;
      font-size: 0.9rem;
      justify-content: center;
      color: #ffffff;
    }

    &.is-active .dropdown-item,
    &.is-active .dropdown-item span,
    &.is-active .dropdown-trigger span {
      color: #ffffff !important;
    }

    .dropdown-item-link {
      color: inherit;
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    }

    .dropdown-item-link:hover {
      color: unset;
    }
    .dropdown-content {
      width: fit-content;
      min-width: 100%;
      border-radius: 0.7em;
      background: $color-2;
    }
    .dropdown-menu {
      min-width: unset !important;
      width: fit-content;
      right: 0;
      left: auto;
    }
    .download-icon {
      font-size: 1em;
    }

    .dropdown-item:hover {
      background-color: color-mix(in srgb, $color-2 95%, #000000);
    }
  }
</style>
