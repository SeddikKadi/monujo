<template>
  <section id="login" tabindex="0" @keyup.enter="submit()">
    <div class="login-container">
      <div class="card">
        <img
          v-if="$config.loginLogoUrl"
          :src="$config.loginLogoUrl"
          class="pt-2 pb-5"
        />
        <form @submit.prevent="submit">
          <div class="field mb-5 has-addons">
            <p class="control has-icons-left is-expanded">
              <input
                name="login"
                v-model.trim="email"
                autocapitalize="none"
                class="input"
                :placeholder="$gettext('Email')"
              />
              <span class="icon is-small is-left">
                <fa-icon icon="envelope" />
              </span>
            </p>
            <p class="control" v-if="biometryEnabled && biometryAvailable">
              <a class="button is-info">
                <fa-icon
                  icon="fingerprint"
                  @click="requestBiometricAuthentication()"
                />
              </a>
            </p>
          </div>
          <div class="field mb-2">
            <p class="control has-icons-left">
              <PasswordField
                :password="password"
                @update:password="(x) => (password = x)"
              />
            </p>
          </div>
          <div class="links-container mb-2">
            <button
              v-if="!$config?.hideResetPassword && canResetPassword"
              @click="$router.push({ name: 'Reset password' })"
              type="button"
            >
              {{ $gettext("Forgot password ?") }}
            </button>
            <button
              v-if="
                !$config?.hideAccountCreate && ($config.signUpUrl || canSignup)
              "
              @click="onClickSignUp()"
              type="button"
            >
              {{ $gettext("Not a member yet ?") }}
            </button>
          </div>
          <div class="login-buttons">
            <div>
              <p class="control has-text-centered">
                <button type="submit" class="button is-login">
                  {{ $gettext("Sign in") }}
                </button>
              </p>
            </div>
          </div>

          <p class="has-text-danger has-text-centered" v-if="fail">
            {{ fail }}
          </p>
        </form>
      </div>
    </div>
    <router-view></router-view>
  </section>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { RestExc } from "@lokavaluto/lokapi-browser"
  import { e as RequestExc } from "@0k/types-request"

  import BiometrySetupDialogContent from "@/components/BiometrySetupDialogContent.vue"
  import PasswordField from "@/components/PasswordField.vue"
  import { showSpinnerMethod } from "@/utils/showSpinner"
  import applyDecorators from "@/utils/applyDecorators"
  import { debounceMethod } from "@/utils/debounce"

  @Options({
    name: "Login",
    components: {
      BiometrySetupDialogContent,
      PasswordField,
    },
    data() {
      return {
        email: "",
        password: "",
        fail: "",
        success: "",
        biometryEnabled: false, // User preference
        biometryAvailable: false, // Biometry available and credential saved
        canResetPassword: false,
        canSignup: false,
      }
    },
    watch: {
      async email() {
        await this.getHasBiometricCredentialsEnabled()
        await this.getHasBiometricCredentialsAvailable()
      },
    },
    async mounted() {
      ;(this.$el as HTMLElement).focus()
      const savedLoginEmail = this.$persistentStore.get("loginEmail")
      if (savedLoginEmail) this.email = savedLoginEmail

      this.getCanResetPassword()
      if (!this.$config.hideAccountCreate && !this.$config.signUpUrl)
        this.getCanSignup()
      ;(await this.getHasBiometricCredentialsEnabled()) &&
        (await this.getHasBiometricCredentialsAvailable()) &&
        (await this.requestBiometricAuthentication())
    },
    methods: {
      onClickSignUp() {
        this.$config.signUpUrl
          ? window.open(this.$config.signUpUrl)
          : this.$router.push({ name: "Signup" })
      },
      async getCanResetPassword() {
        this.canResetPassword = await this.$lokapi.canResetPassword()
      },
      async getCanSignup() {
        this.canSignup = await this.$lokapi.canSignup()
      },
      normalizeLogin(login: string) {
        return login?.trim().toLowerCase()
      },
      getBiometryOwner(settings: any) {
        return this.normalizeLogin(
          settings?.biometryOwner || this.$persistentStore.get("loginEmail")
        )
      },
      getCurrentBiometryPreference(settings: any, login: string) {
        if (this.getBiometryOwner(settings) !== this.normalizeLogin(login)) {
          return undefined
        }
        return settings?.biometryEnabled
      },
      async setBiometryPreference(login: string, value: boolean) {
        const settings = (await this.$localSettings.load()) || {}
        settings.biometryEnabled = value
        settings.biometryOwner = this.normalizeLogin(login)
        await this.$localSettings.save(settings)
      },
      async getConfiguredBiometryLogin() {
        return this.$biometry.getSavedUsername("login")
      },
      async getHasBiometricCredentialsEnabled() {
        const settings = (await this.$localSettings.load()) || {}
        this.biometryEnabled =
          this.getCurrentBiometryPreference(settings, this.email) === true
        return this.biometryEnabled
      },
      async getHasBiometricCredentialsAvailable() {
        const configuredLogin = await this.getConfiguredBiometryLogin()
        this.biometryAvailable =
          configuredLogin === this.normalizeLogin(this.email) &&
          (await this.$biometry.hasCredentialsAvailable("login"))
        return this.biometryAvailable
      },
      async requestBiometricAuthentication(): Promise<void> {
        let credentials: any
        try {
          credentials = await this.$biometry.challenge("login")
        } catch (e) {
          console.log(e)
          credentials = false
        }
        if (credentials) {
          this.password = credentials.password
          this.email = credentials.username
          this.submit()
        }
      },
      submit: applyDecorators(
        [debounceMethod, showSpinnerMethod(".login-container")],
        async function (this: any): Promise<void> {
          const normalizedEmail = this.normalizeLogin(this.email)
          try {
            await this.$store.dispatch("login", {
              login: normalizedEmail,
              password: this.password,
            })
            this.success = this.$gettext("Connection successful")
            this.$router.push({ name: "dashboard" })
            this.$persistentStore.set("loginEmail", normalizedEmail)
          } catch (e) {
            // { APIRequestFailed, InvalidCredentials }
            if (e instanceof RestExc.APIRequestFailed) {
              this.fail = this.$gettext(
                "Request refused by remote server. Contact your administrator"
              )
              return
            }
            if (e instanceof RestExc.InvalidCredentials) {
              this.fail = this.$gettext("Invalid credentials")
              return
            }
            if (e instanceof RequestExc.RequestFailed) {
              this.fail = this.$gettext("Request failed to remote server.")
              return
            }
            this.fail = this.$gettext(
              "Unexpected issue when attempting to connect to remote server."
            )
            throw e
          }

          const biometryAvailable = await this.$biometry.isAvailable()
          if (!biometryAvailable) return

          const prefs = (await this.$localSettings.load()) || {}
          const configuredBiometryLogin = await this.getConfiguredBiometryLogin()
          const isReplacingBiometryLogin =
            configuredBiometryLogin && configuredBiometryLogin !== normalizedEmail
          const biometryEnabled = this.getCurrentBiometryPreference(
            prefs,
            normalizedEmail
          )
          if (biometryEnabled === false) return
          if (
            biometryEnabled === null ||
            typeof biometryEnabled === "undefined"
          ) {
            const answer = await this.$dialog.show({
              title: this.$gettext("Enable biometric login"),
              content: {
                extends: BiometrySetupDialogContent,
                props: {
                  configuredBiometryLogin: {
                    type: String,
                    default: isReplacingBiometryLogin
                      ? configuredBiometryLogin
                      : "",
                  },
                },
              },
              buttons: [
                { label: this.$gettext("Yes"), id: "yes" },
                { label: this.$gettext("No"), id: "no" },
                { label: this.$gettext("Ask me later"), id: "later" },
              ],
            })
            if (answer === "later") return
            if (answer === "no") {
              await this.setBiometryPreference(this.email, false)
              return
            }
            await this.setBiometryPreference(this.email, true)
            this.$msg.success(
              isReplacingBiometryLogin
                ? this.$gettext(
                    "Biometric login will be replaced for the other account after your next login"
                  )
                : this.$gettext(
                    "Biometric login will be set up after your next login"
                  )
            )
            return
          }
          // biometryEnabled is true
          const hasCredentialsAvailable =
            configuredBiometryLogin === normalizedEmail &&
            (await this.$biometry.hasCredentialsAvailable("login"))
          if (hasCredentialsAvailable) return
          try {
            await this.$biometry.saveCredentials("login", {
              username: this.email,
              password: this.password,
            })
          } catch (e) {
            this.$msg.error(
              this.$gettext(
                "Unexpected issue occurred while saving your credentials"
              )
            )
            throw e
          }

          this.$msg.success(
            this.$gettext("Biometric login successfully set up")
          )
        }
      ),
    },
  })
  export default class Login extends Vue {}
</script>
<style scoped lang="scss">
  @import "@/assets/custom-variables.scss";
  .control a.is-info {
    background-color: var(--btn-pay-background-color, $color-2);
    z-index: 10;
  }
  #login {
    position: absolute;
    display: table;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
    .login-container {
      display: table-cell;
      vertical-align: middle;
      padding: 0 10px;
      .card {
        margin: 0 auto;
        max-width: 380px;
        padding: 20px;
        text-align: center;
        img {
          max-width: 200px;
        }
        .field {
          font-size: 2rem;
        }
        .login-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-buttons > div {
          margin: 6px;
        }
        .links-container {
          margin-top: 1em;
          display: flex;
          flex-direction: column;
          align-items: flex-end;

          button {
            border: none;
            background: none;
            color: #777777;
            cursor: pointer;
          }
        }

        @media screen and (min-width: 768px) {
          padding: 30px;
        }

        .create-account {
          color: $color-2;
          border-color: $color-2;
          background: #ffffff;
        }
        .create-account:hover {
          color: $color-2;
          border-color: $color-2;
          background: #ffffff;
        }
      }
    }
  }
</style>
