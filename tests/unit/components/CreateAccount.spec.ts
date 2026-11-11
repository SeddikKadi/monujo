import { describe, expect, it, vi } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createStore } from "vuex"
import CreateAccount from "../../../src/components/CreateAccount.vue"
import { lokapiStoreFactory } from "../../../src/store/lokapi"

vi.mock("@/utils/showSpinner", () => ({ showSpinnerMethod: () => (fn: any) => fn }))

const french: Record<string, string> = {
  main: "compte principal",
}

const INVALID_CHARACTERS =
  "Use only letters, digits, spaces, hyphens and apostrophes. " +
  "The name must start and end with a letter or a digit."
const NOT_UNIQUE = "You already have a wallet with this name in this currency."

async function renderCreation(walletsPerBackend: number[] = [], locale = "en", realPasswordField = false, hasExistingWallet = false) {
  const backendId = "comchain:Test"
  const backend = {
    userAccounts: hasExistingWallet ? { existing: { active: true } } : {},
    createUserAccount: vi.fn(), registerWallet: vi.fn(),
    jsonData: { type: backendId },
  }
  const backends = {
    [backendId]: backend,
    ...Object.fromEntries(walletsPerBackend.map((count, currency) => [
      `comchain:Existing${currency}`,
      {
        userAccounts: Object.fromEntries(Array.from({ length: count }, (_, i) => [
          `wallet-${i}`,
          // Pending wallets still count, and two balances are only one wallet.
          { active: i > 0, accounts: [{ type: "converted" }, { type: "mutual" }] },
        ])),
        createUserAccount: vi.fn(), registerWallet: vi.fn(),
        jsonData: { type: `comchain:Existing${currency}` },
      },
    ])),
  }
  const create = vi.fn(async () => ({ internalId: "comchain:new-wallet" }))
  const router = { push: vi.fn() }
  const store = createStore({
    getters: {
      getCreatableBackends: () => lokapiStoreFactory({}, {}).getters.getCreatableBackends({ backends }),
      getBackends: () => () => backends,
    },
    actions: {
      checkPasswordStrength: vi.fn(async () => []),
      createUserAccount: create,
      fetchComponentDefs: vi.fn(),
    },
  })
  const wrapper = mount(CreateAccount, {
    global: {
      plugins: [store],
      mocks: {
        $config: { disableImportWallet: false },
        $gettext: (s: string) => locale === "fr" ? french[s] || s : s,
        $gettextInterpolate: (s: string, values: { number: number }) =>
          s.replace("%{ number }", String(values.number)),
        $auth: { getAccountAuth: vi.fn(async () => ({ authPrefHandler: {} })) },
        $router: router,
        $msg: { error: vi.fn(), warning: vi.fn() },
      },
      stubs: { AuthPref: true, PasswordField: !realPasswordField, transition: true },
    },
  })
  await flushPromises()
  const vm = wrapper.vm as any
  await wrapper.setData({ form: {
    accountPassword: "Strong wallet password!1",
    accountPasswordConfirm: "Strong wallet password!1",
  } })
  await flushPromises()
  return { wrapper, vm, create, router, backendId }
}

describe("CreateAccount wallet name", () => {
  it("creates a second wallet in an already configured currency and returns to the dashboard", async () => {
    const { wrapper, vm, create, router, backendId } = await renderCreation([], "en", false, true)
    expect(router.push).not.toHaveBeenCalled()
    expect(vm.form.accountBackend).toBe(backendId)
    expect(vm.form.walletLabel).toBe("")
    await wrapper.get("#new-wallet-name").setValue("Savings")
    await vm.createUserAccount()
    expect(create).toHaveBeenCalledWith(expect.anything(), [
      "Strong wallet password!1", backendId, "Savings",
    ])
    expect(router.push).toHaveBeenCalledWith({ name: "dashboard" })
    expect(vm.canImport).toBe(true)
    wrapper.unmount()
  })

  it("can choose an already configured currency when several support creation", async () => {
    const { wrapper, vm, create } = await renderCreation([2])
    await wrapper.findAll("button").find(button => button.text() === "comchain:Existing0")!.trigger("click")
    await wrapper.get("#new-wallet-name").setValue("Shop")
    await vm.createUserAccount()
    expect(create).toHaveBeenCalledWith(expect.anything(), [
      "Strong wallet password!1", "comchain:Existing0", "Shop",
    ])
    wrapper.unmount()
  })

  it("keeps the label in a separate form from the real password inputs", async () => {
    const { wrapper } = await renderCreation([], "en", true)
    const label = wrapper.get<HTMLInputElement>("#new-wallet-name").element
    const passwords = wrapper.findAll<HTMLInputElement>('input[type="password"]')
    expect(label.type).toBe("text")
    expect(label.form?.id).toBe("new-wallet-name-form")
    expect(label.form?.elements.length).toBe(1)
    expect(passwords).toHaveLength(2)
    for (const password of passwords) {
      expect(password.element.form).not.toBe(label.form)
      expect(password.attributes("autocomplete")).toBe("new-password")
    }
  })

  it("submits the first wallet's default name once through its form", async () => {
    const { wrapper, create, backendId } = await renderCreation()
    await wrapper.get("#new-wallet-name-form").trigger("submit")
    await flushPromises()
    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(expect.anything(), [
      "Strong wallet password!1", backendId, "main",
    ])
  })

  it.each([["en", "main"], ["fr", "compte principal"]])(
    "prefills the first wallet with its default name in %s", async (locale, expected) => {
      const { wrapper, vm, create, backendId } = await renderCreation([], locale)
      const input = wrapper.get<HTMLInputElement>("#new-wallet-name")
      expect(input.element.value).toBe(expected)
      expect(input.attributes("required")).toBeDefined()
      expect(vm.hasFieldErrors).toBe(false)
      await vm.createUserAccount()
      expect(create).toHaveBeenCalledWith(expect.anything(), [
        "Strong wallet password!1", backendId, expected,
      ])
    }
  )

  it.each([1, 2, 3, 9])("proposes no name when %i wallets already exist", async count => {
    const { wrapper, vm, create } = await renderCreation([count])
    const input = wrapper.get<HTMLInputElement>("#new-wallet-name")
    expect(input.element.value).toBe("")
    expect(input.attributes("placeholder")).toBeUndefined()
    expect(vm.hasFieldErrors).toBe(true)
    await vm.createUserAccount()
    expect(create).not.toHaveBeenCalled()
  })

  it("counts wallets across currencies, including pending wallets", async () => {
    const { wrapper } = await renderCreation([0, 1])
    expect(wrapper.get<HTMLInputElement>("#new-wallet-name").element.value).toBe("")
  })

  it.each([
    [[], ""], [[], "   "], [[1], ""], [[1], "   "],
  ])("refuses to create a wallet named %j after clearing the name to %j", async (wallets, label) => {
    const { wrapper, vm, create } = await renderCreation(wallets as number[])
    await wrapper.get("#new-wallet-name").setValue(label)
    await wrapper.get("#new-wallet-name").trigger("blur")
    expect(vm.hasFieldErrors).toBe(true)
    expect(wrapper.get("#new-wallet-name-error").text()).toBe("Please enter a wallet name.")
    expect(wrapper.findAll("button").find(b => b.text() === "Create my wallet")!
      .attributes("disabled")).toBeDefined()
    await wrapper.get("#new-wallet-name-form").trigger("submit")
    await wrapper.get('input[autocomplete="new-password"]').trigger("keyup.enter")
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ["a/b", INVALID_CHARACTERS],
    ["Café-", INVALID_CHARACTERS],
    ["main", NOT_UNIQUE],
    ["Shop", NOT_UNIQUE],
    [" shop ", NOT_UNIQUE],
  ])("refuses the name %j while typing", async (label, message) => {
    const { wrapper, vm, create } = await renderCreation([1])
    // The wallets of the chosen currency: an unnamed one and "Shop".
    vm.getBackends()["comchain:Test"].userAccounts.unnamed = {}
    vm.getBackends()["comchain:Test"].userAccounts.named = { label: "Shop" }
    await wrapper.get("#new-wallet-name").setValue(label)
    expect(wrapper.get("#new-wallet-name-error").text()).toBe(message)
    expect(vm.hasFieldErrors).toBe(true)
    await wrapper.get("#new-wallet-name-form").trigger("submit")
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
  })

  it("accepts a name used in another currency, and checks again when the currency changes", async () => {
    const { wrapper, vm } = await renderCreation([1])
    vm.getBackends()["comchain:Existing0"].userAccounts["wallet-0"].label = "Shop"
    await wrapper.get("#new-wallet-name").setValue("Shop")
    expect(wrapper.find("#new-wallet-name-error").exists()).toBe(false)
    expect(vm.isWalletLabelValid).toBe(true)
    await wrapper.findAll("button").find(b => b.text() === "comchain:Existing0")!.trigger("click")
    expect(wrapper.get("#new-wallet-name-error").text()).toBe(NOT_UNIQUE)
    await wrapper.findAll("button").find(b => b.text() === "comchain:Test")!.trigger("click")
    expect(wrapper.find("#new-wallet-name-error").exists()).toBe(false)
  })

  it.each(["Café-bar", "L'atelier", "L\u2019atelier"])("accepts the name %j", async (label) => {
    const { wrapper, vm } = await renderCreation()
    await wrapper.get("#new-wallet-name").setValue(label)
    expect(wrapper.find("#new-wallet-name-error").exists()).toBe(false)
    expect(vm.isWalletLabelValid).toBe(true)
  })

  it("shows the reason when Odoo refuses the name and stays on the page", async () => {
    const { wrapper, vm, create, router } = await renderCreation([1])
    create.mockRejectedValueOnce(Object.assign(new Error("refused"), {
      name: "InvalidWalletLabel", reason: "not-unique",
    }))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await wrapper.get("#new-wallet-name").setValue("Workshop")
    await vm.createUserAccount()
    await flushPromises()
    expect(wrapper.get("#new-wallet-name-error").text()).toBe(NOT_UNIQUE)
    expect(vm.$msg.error).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it("still blocks oversized names, including Enter submission", async () => {
    const { wrapper, vm, create } = await renderCreation()
    await wrapper.get("#new-wallet-name").setValue("x".repeat(31))
    await wrapper.get('input[autocomplete="new-password"]').trigger("keyup.enter")
    await flushPromises()
    expect(vm.hasFieldErrors).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it("sends a custom trimmed public name", async () => {
    const { wrapper, vm, create, router, backendId } = await renderCreation([1])
    await wrapper.get("#new-wallet-name").setValue("  Shop  ")
    expect(wrapper.get("#new-wallet-name-help").text()).toBe(
      "Give this wallet a name to tell it apart from your others. " +
        "This name is public: people who pay you will see it."
    )
    expect(vm.hasFieldErrors).toBe(false)
    await wrapper.findAll("button").find(b => b.text() === "Create my wallet")!.trigger("click")
    await flushPromises()
    expect(create).toHaveBeenCalledWith(expect.anything(), [
      "Strong wallet password!1", backendId, "Shop",
    ])
    expect(router.push).toHaveBeenCalledWith({ name: "dashboard" })
  })

  it("accepts a 30-character name and keeps wallet import separate", async () => {
    const { wrapper, vm } = await renderCreation()
    await wrapper.get("#new-wallet-name").setValue("é".repeat(30))
    expect(vm.hasFieldErrors).toBe(false)
    await wrapper.get('input[value="import"]').setValue(true)
    await flushPromises()
    expect(wrapper.find("#new-wallet-name").exists()).toBe(false)
    expect(wrapper.get("#import-wallet").attributes("disabled")).toBeUndefined()
  })
})
