<template>
  <div class="section-card">
    <h2
      v-if="pendingUserAccounts.length !== 0"
      class="custom-card-title title-card"
    >
      {{ $gettext("Account creations waiting for approval") }}
    </h2>
    <div class="notification is-danger is-light" v-if="hasLoadingError">
      <p class="mb-4">
        {{
          $gettext(
            "An unexpected issue occurred while loading the " +
              "pending account list. Sorry for the inconvenience."
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
    <div v-else class="accounts">
      <div>
        <div
          v-for="account in pendingUserAccounts"
          :key="account.internalId"
          :data-wallet-id="encodeURIComponent(account.internalId)"
          class="mb-2 account-row shadow-bottom"
        >
          <div class="row-user">
            <span class="user-label">
              {{ account.name }}
              <span v-if="account.walletLabel">
                — {{ walletLabel(account.walletLabel) }}</span
              >
              {{ account.markBackend ? `(via ${account.backendId})` : "" }}
            </span>
          </div>
          <div class="row-actions">
            <div class="buttons is-right">
              <a
                class="
                  button
                  is-primary
                  custom-button custom-inverted
                  is-small
                  discard-account
                  icon-btn
                "
                @click="discardUserAccount(account)"
              >
                <span class="icon">
                  <fa-icon class="fa-thick" icon="xmark" />
                </span>
                <span class="button-label">
                  {{ $gettext("Discard") }}
                </span>
              </a>
              <a
                class="
                  button
                  is-primary
                  custom-button custom-inverted
                  is-small
                  validate-account
                  icon-btn
                "
                @click="validateUserAccount(account)"
              >
                <span class="icon">
                  <fa-icon class="fa-thick" icon="check" />
                </span>
                <span class="button-label">
                  {{ $gettext("Approve") }}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { translateWalletLabel } from "@/utils/account"
  import { UIError } from "@/exception"
  import { showSpinnerMethod, replaceWithLoader } from "@/utils/showSpinner"
  import { debounceMethodWithOpts } from "@/utils/debounce"
  import applyDecorators from "@/utils/applyDecorators"

  @Options({
    name: "PendingAccounts",
    props: {
      refreshToggle: Boolean,
      adminWallet: Object,
    },
    emits: ["hasAccounts"],
    data() {
      return {
        hasLoadingError: false,
        pendingUserAccounts: [],
        loadVersion: 0,
      }
    },
    mounted() {
      this.updatePendingAccount()
    },
    watch: {
      refreshToggle() {
        this.updatePendingAccount()
      },
    },
    methods: {
      walletLabel(label: string) {
        return translateWalletLabel(label, this.$gettext)
      },
      /** Name of a pending wallet in messages: its owner and its name. */
      accountName(account: any): string {
        return account.walletLabel
          ? `${account.name} — ${this.walletLabel(account.walletLabel)}`
          : account.name
      },
      validateUserAccount: applyDecorators(
        [
          debounceMethodWithOpts({
            keyFn: (account: any) => account.internalId,
          }),
        ],
        async function (this: any, account: any): Promise<void> {
          await this.validateCreation(account)
          await this.updatePendingAccount()
        }
      ),
      validateCreation: applyDecorators(
        [
          showSpinnerMethod(function (
            this: any,
            isLoading: boolean,
            account: any
          ) {
            return replaceWithLoader.apply(this, [
              `[data-wallet-id="${encodeURIComponent(
                account.internalId
              )}"] .validate-account`,
              "2em",
            ])
          }),
        ],
        async function (this: any, account: any): Promise<void> {
          try {
            await account.validateCreation()
          } catch (err: any) {
            if (err.message === "User canceled the dialog box") {
              // A warning message should have already been sent
              return
            }

            throw new UIError(
              this.$gettext(
                "An unexpected issue occurred while approving " +
                  "the wallet account creation of user %{ name }",
                { name: this.accountName(account) }
              ),
              err
            )
          }
          this.$msg.success(
            this.$gettext("User %{ name }'s account creation was approved", {
              name: this.accountName(account),
            })
          )
        }
      ),

      discardUserAccount: applyDecorators(
        [
          debounceMethodWithOpts({
            keyFn: (account: any) => account.internalId,
          }),
        ],
        async function (this: any, account: any): Promise<void> {
          await this.discardCreation(account)
          await this.updatePendingAccount()
        }
      ),
      discardCreation: applyDecorators(
        [
          showSpinnerMethod(function (
            this: any,
            isLoading: boolean,
            account: any
          ) {
            return replaceWithLoader.apply(this, [
              `[data-wallet-id="${encodeURIComponent(
                account.internalId
              )}"] .discard-account`,
              "2em",
            ])
          }),
        ],
        async function (this: any, account: any): Promise<void> {
          try {
            await account.discardCreateRequest()
          } catch (err) {
            throw new UIError(
              this.$gettext(
                "An unexpected issue occurred while discarding " +
                  "the wallet account creation of user %{ name }",
                { name: this.accountName(account) }
              ),
              err
            )
          }
          this.$msg.success(
            this.$gettext("User %{ name }'s account creation was discarded", {
              name: this.accountName(account),
            })
          )
        }
      ),
      updatePendingAccount: applyDecorators(
        [showSpinnerMethod(".accounts")],
        async function (this: any): Promise<void> {
          const version = ++this.loadVersion
          try {
            const accounts = await this.adminWallet.getStagingUserAccounts()
            if (version !== this.loadVersion) return
            this.pendingUserAccounts = accounts
            this.hasLoadingError = false
          } catch (err: any) {
            if (version !== this.loadVersion) return
            this.pendingUserAccounts = []
            console.error("Failed to fetch pending accounts", err)
            this.hasLoadingError = true
            throw new UIError(
              this.$gettext(
                "An unexpected issue occurred while updating the pending accounts list"
              ),
              err
            )
          }
          this.$emit("hasAccounts", this.pendingUserAccounts.length > 0)
        }
      ),
    },
  })
  export default class PendingAccounts extends Vue {}
</script>
<style scoped lang="scss">
  .shadow-bottom {
    border-radius: 1em;
    box-shadow: 0 3px 6px -6px black;
  }
  .account-row {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 1rem;
    background-color: #fff;

    &:nth-child(even) {
      background-color: #fafafa;
    }

    & + .account-row {
      border-bottom: 1px solid #dbdbdb;
    }
  }

  .row-user {
    flex: 1;
    min-width: 0;
    width: fit-content;
  }

  .accounts {
    container-type: inline-size;
    container-name: accounts;
  }

  .user-label {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-actions {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;

    .buttons {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.5rem;
    }
  }

  body .discard-account {
    background-color: #cc0f35;
    border-color: #cc0f35;
  }

  @container accounts (max-width: 28rem) {
    .account-row {
      padding: 0.5rem 0.75rem;
      gap: 0.25rem;
    }

    .row-actions .buttons {
      display: inline-flex;
      gap: 0.25rem;
      justify-content: flex-end;
    }

    .discard-account,
    .validate-account {
      font-size: 0.6rem;
    }

    .buttons .button {
      width: 3rem;
      height: 3rem;
      border-radius: 100%;
      display: flex;
      justify-content: center;
      align-items: center;

      .icon {
        svg {
          width: 1.8em;
          height: 1.8em;
        }
      }
      .button-label {
        display: none;
      }
    }
    .button .icon:first-child:not(:last-child) {
      margin-left: 0em;
      margin-right: 0em;
    }
  }
</style>
