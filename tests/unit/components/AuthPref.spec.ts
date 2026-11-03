import { describe, expect, it, vi } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { reactive } from "vue"
import AuthPref from "../../../src/components/AuthPref.vue"
import AuthPrefs from "../../../src/components/AuthPrefs.vue"
import { walletTranslations } from "../helpers/walletTranslations"

async function renderSettings(labels: string[]) {
  const gettext = walletTranslations()
  const accounts = reactive(labels.map((label, index) => ({
    internalId: `comchain:wallet-${index}`,
    label,
    requestCredentials: vi.fn(),
  })))
  const handlers = accounts.map(() => ({ userConfig: null }))
  const wrapper = mount(AuthPrefs, {
    props: { prefsData: { userAccountsRequiringAuth: accounts } },
    global: {
      stubs: { "fa-icon": true },
      mocks: {
        $gettext: gettext.$gettext,
        $auth: {
          getAccountAuth: vi.fn(async (id: string) => ({
            authPrefHandler: handlers[accounts.findIndex(account => account.internalId === id)],
          })),
        },
      },
    },
  })
  await flushPromises()
  return { wrapper, gettext, accounts, handlers }
}

describe("AuthPref wallet label", () => {
  it("updates the default name in authentication settings after a language change", async () => {
    const { wrapper, gettext } = await renderSettings(["compte principal"])
    expect(wrapper.get(".auth-pref-name").text()).toBe("main")
    gettext.current = "fr-FR"
    await wrapper.vm.$nextTick()
    expect(wrapper.get(".auth-pref-name").text()).toBe("compte principal")
    wrapper.unmount()
  })

  it("labels an older unnamed wallet with the dashboard fallback and shows its identifier separately", async () => {
    const { wrapper, accounts } = await renderSettings([""])
    expect(wrapper.get(".auth-pref-name").text()).toBe("Main")
    expect(wrapper.get(".auth-pref-identifier").text()).toBe(accounts[0].internalId)
    expect(wrapper.get(".auth-pref-identifier").attributes("title")).toBe(accounts[0].internalId)
    expect(wrapper.get("h3").text()).toBe("Simplified authentication")
    expect(wrapper.find(".auth-pref-description").exists()).toBe(false)
    expect(wrapper.get('input[type="checkbox"]').attributes("aria-label"))
      .toBe("Simplified authentication for Main")
    wrapper.unmount()
  })

  it("keeps each wallet's authentication row when duplicate names are renamed", async () => {
    const { wrapper, accounts, handlers } = await renderSettings(["Shop", "Shop"])
    expect(wrapper.get("h3").text()).toBe("Simplified authentication")
    expect(wrapper.findAll(".auth-pref-description")).toHaveLength(0)
    const originalRows = wrapper.findAllComponents(AuthPref)
    accounts[0].label = "Office"
    await wrapper.vm.$nextTick()
    const rows = wrapper.findAllComponents(AuthPref)
    expect(rows.map(row => row.get(".auth-pref-name").text())).toEqual(["Office", "Shop"])
    expect(rows[0].vm.$.uid).toBe(originalRows[0].vm.$.uid)
    expect(rows[1].vm.$.uid).toBe(originalRows[1].vm.$.uid)
    expect((rows[0].props() as any).handler).toBe(handlers[0])
    expect((rows[1].props() as any).handler).toBe(handlers[1])
    wrapper.unmount()
  })
})

function renderAuthentication(configured = false) {
  const gettext = walletTranslations()
  const requestCredentials = vi.fn(async (_challenge?: any) => "verified-wallet-secret")
  const handler = {
    userConfig: configured ? { subConfig: {} } : null,
    accountAuthService: { secret: "" },
    Ui: { Pref: { name: "TestAuthEditor" } },
  }
  const wrapper = mount(AuthPref, {
    props: { name: "Shop", handler, requestCredentials },
    global: {
      mocks: { $gettext: gettext.$gettext },
      stubs: {
        "fa-icon": true,
        TestAuthEditor: { template: '<div class="test-auth-editor">PIN settings</div>' },
      },
    },
  })
  return { wrapper, handler, requestCredentials }
}

describe("AuthPref edit action", () => {
  it("keeps Edit visible and disabled until the switch is enabled, then opens the editor on click", async () => {
    const { wrapper, handler, requestCredentials } = renderAuthentication()
    await wrapper.vm.$nextTick()
    const button = wrapper.get<HTMLButtonElement>(".auth-pref-edit button")
    expect(button.element.disabled).toBe(true)
    expect(wrapper.find(".test-auth-editor").exists()).toBe(false)

    await wrapper.get('input[type="checkbox"]').trigger("click")
    await flushPromises()
    expect(requestCredentials).toHaveBeenCalledOnce()
    expect(requestCredentials).toHaveBeenCalledWith(expect.any(Function))
    expect(handler.accountAuthService.secret).toBe("verified-wallet-secret")
    expect(button.element.disabled).toBe(false)
    expect(wrapper.find(".test-auth-editor").exists()).toBe(false)
    expect(wrapper.emitted("saveConfig")).toBeUndefined()

    await button.trigger("click")
    await flushPromises()
    expect(wrapper.get(".test-auth-editor").text()).toBe("PIN settings")
    expect(requestCredentials).toHaveBeenCalledOnce()
    expect(button.element.disabled).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 1))
    wrapper.unmount()
  })

  it("keeps Edit disabled when enabling authentication is cancelled", async () => {
    const { wrapper, requestCredentials } = renderAuthentication()
    requestCredentials.mockRejectedValueOnce(new Error("User canceled the dialog box"))
    await wrapper.get('input[type="checkbox"]').trigger("click")
    await flushPromises()
    expect(wrapper.get<HTMLButtonElement>(".auth-pref-edit button").element.disabled).toBe(true)
    expect(wrapper.get<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(false)
    expect(wrapper.find(".test-auth-editor").exists()).toBe(false)
    expect(wrapper.emitted("saveConfig")).toBeUndefined()
    await new Promise(resolve => setTimeout(resolve, 1))
    wrapper.unmount()
  })

  it("authenticates before editing an already configured wallet", async () => {
    const { wrapper, requestCredentials } = renderAuthentication(true)
    await wrapper.vm.$nextTick()
    const button = wrapper.get<HTMLButtonElement>(".auth-pref-edit button")
    expect(button.element.disabled).toBe(false)
    requestCredentials.mockRejectedValueOnce(new Error("User canceled the dialog box"))
    await button.trigger("click")
    await flushPromises()
    expect(wrapper.find(".test-auth-editor").exists()).toBe(false)
    expect(button.element.disabled).toBe(false)

    await button.trigger("click")
    await flushPromises()
    expect(requestCredentials).toHaveBeenCalledTimes(2)
    expect(requestCredentials).toHaveBeenLastCalledWith(undefined)
    expect(wrapper.find(".test-auth-editor").exists()).toBe(true)
    wrapper.unmount()
  })

  it("closes the editor and disables Edit after switching authentication off", async () => {
    const { wrapper, handler, requestCredentials } = renderAuthentication(true)
    await wrapper.vm.$nextTick()
    await wrapper.get(".auth-pref-edit button").trigger("click")
    await flushPromises()
    expect(wrapper.find(".test-auth-editor").exists()).toBe(true)
    requestCredentials.mockRejectedValueOnce(new Error("User canceled the dialog box"))
    await wrapper.get('input[type="checkbox"]').trigger("click")
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true)
    expect(wrapper.find(".test-auth-editor").exists()).toBe(true)
    expect(handler.userConfig).not.toBeNull()
    expect(wrapper.emitted("saveConfig")).toBeUndefined()

    await wrapper.get('input[type="checkbox"]').trigger("click")
    await flushPromises()
    expect(requestCredentials).toHaveBeenLastCalledWith(expect.any(Function))
    expect(handler.userConfig).toBeNull()
    expect(wrapper.find(".test-auth-editor").exists()).toBe(false)
    expect(wrapper.get<HTMLButtonElement>(".auth-pref-edit button").element.disabled).toBe(true)
    expect(wrapper.emitted("saveConfig")?.[0]).toEqual([handler.accountAuthService, null])
    await new Promise(resolve => setTimeout(resolve, 1))
    wrapper.unmount()
  })
})
