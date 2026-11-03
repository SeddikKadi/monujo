<template>
  <PrefsSection
    v-if="userAccounts.length > 0"
    :title="$gettext('Simplified authentication')"
    :description="$gettext('On this device')"
  >
    <div v-for="account in userAccounts" :key="account.id">
      <AuthPref
        :name="account.name()"
        :identifier="account.id"
        :showDescription="false"
        :handler="account.handler"
        :requestCredentials="account.requestCredentials"
        @saveConfig="saveConfig"
      />
    </div>
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
