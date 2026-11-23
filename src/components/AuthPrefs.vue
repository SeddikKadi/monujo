<template>
  <PrefsSection v-if="userAccounts.length > 0" class="auth-prefs mb-5">
    <template #header>
      <h3 class="auth-prefs-title">{{ $gettext("PIN code for payments") }}</h3>
      <p class="auth-prefs-description">
        {{
          $gettext(
            "On this device, confirm your payments with a 4-digit code " +
              "instead of typing your whole password."
          )
        }}
      </p>
    </template>
    <div
      v-for="account in userAccounts"
      :key="account.id"
      class="auth-prefs-wallet"
    >
      <AuthPref
        :name="account.name()"
        :identifier="account.id"
        :showDescription="false"
        :handler="account.handler"
        :requestCredentials="account.requestCredentials"
        @saveConfig="saveConfig"
      />
    </div>
    <p class="auth-prefs-note">
      {{ $gettext("Your password is asked to turn a PIN code on or off.") }}
    </p>
  </PrefsSection>
</template>
<script lang="ts">
  import { markRaw } from "vue"
  import { Options, Vue } from "vue-class-component"
  import PrefsSection from "@/components/PrefsSection.vue"
  import AuthPref from "@/components/AuthPref.vue"
  import { getWalletName } from "@/utils/account"

  @Options({
    name: "AuthPrefs",
    components: { AuthPref, PrefsSection },
    props: {
      prefsData: Object,
    },
    data() {
      return {
        userAccounts: [],
      }
    },
    async mounted() {
      this.userAccounts = await this.getUserAccounts()
    },
    methods: {
      saveConfig(accountAuthService: any, userConfig: string) {
        accountAuthService.setUserConfig(userConfig)
        this.$msg.success(this.$gettext("Edits were successfully saved"))
      },

      async getUserAccounts() {
        let userAccounts = this.prefsData.userAccountsRequiringAuth

        // XXXvlab: typeforcing to 'any' as typescript doesn't seem to
        // understand that a 'allSettled' is actually a Promise of an
        // array.
        const preparedTemplateDataPromises = (await Promise.allSettled(
          userAccounts.map(async (userAccount: any) => ({
            id: userAccount.internalId,
            name: getWalletName(userAccount, this.$gettext),
            handler: markRaw(
              (
                await this.$auth.getAccountAuth(userAccount.internalId)
              ).authPrefHandler
            ),
            requestCredentials: (userFn?: any) =>
              userAccount.requestCredentials(userFn),
          }))
        )) as any
        return preparedTemplateDataPromises
          .filter((p: any) => p.status === "fulfilled")
          .map((x: any) => x.value)
      },
    },
  })
  export default class AuthPrefs extends Vue {}
</script>
<style lang="scss" scoped>
  .auth-prefs {
    // The wallets line up with the title, and their switches with the
    // switches of the other sections.
    --prefs-indent: 0;
  }
  .auth-prefs-title {
    font-size: 1.15em;
    font-weight: 500;
    line-height: 1.3;
    color: rgba(0, 0, 0, 0.8);
  }
  .auth-prefs-description,
  .auth-prefs-note {
    font-size: 0.9em;
    color: rgba(0, 0, 0, 0.6);
  }
  .auth-prefs-description {
    margin-top: 0.25rem;
  }
  .auth-prefs-wallet + .auth-prefs-wallet {
    margin-top: 0.75rem;
  }
  .auth-prefs-note {
    margin-top: 1.25rem;
  }
</style>
