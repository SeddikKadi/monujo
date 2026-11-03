import { describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import { createStore } from "vuex"
import WalletLabelModal from "../../../src/components/WalletLabelModal.vue"

import { walletTranslations } from "../helpers/walletTranslations"

const INVALID_CHARACTERS =
  "Use only letters, digits, spaces, hyphens and apostrophes. " +
  "The name must start and end with a letter or a digit."
const NOT_UNIQUE = "You already have a wallet with this name in this currency."

function mountModal(
  setLabel = vi.fn(async () => undefined),
  label = "Shop",
  gettext = (message: string) => message,
  otherLabels: (string | null)[] = ["Savings"],
) {
  const userAccount = { label, setLabel, getTransactions: vi.fn() }
  // The user's wallets, in two currencies.
  const backends = {
    "comchain:a": { userAccounts: { me: userAccount, ...Object.fromEntries(
      otherLabels.slice(0, 1).map((other, i) => [`a${i}`, { label: other }])) } },
    "comchain:b": { userAccounts: Object.fromEntries(
      otherLabels.slice(1).map((other, i) => [`b${i}`, { label: other }])) },
  }
  const store = createStore({ getters: { getBackends: () => () => backends } })
  const refreshAccounts = vi.fn()
  const modal = {
    args: { value: [{ account: { _obj: userAccount }, refreshAccounts }] },
    close: vi.fn(),
  }
  const msg = { error: vi.fn() }
  const wrapper = mount(WalletLabelModal, {
    global: {
      plugins: [store],
      mocks: {
        $gettext: gettext,
        $modal: modal,
        $msg: msg,
      },
    },
  })
  return { wrapper, setLabel, refreshAccounts, modal, msg }
}

describe("WalletLabelModal", () => {
  it.each(["", "   "])("refuses to save the empty name %j", async label => {
    const { wrapper, setLabel, modal } = mountModal()
    await wrapper.get("#wallet-label").setValue(label)
    expect(wrapper.get("#save-wallet-label").attributes("disabled")).toBeDefined()
    await wrapper.get("#wallet-label-form").trigger("submit")
    await flushPromises()
    expect(setLabel).not.toHaveBeenCalled()
    expect(modal.close).not.toHaveBeenCalled()
    expect(wrapper.get("#wallet-label-error").text()).toBe("Please enter a wallet name.")
  })

  it("asks a name for an unnamed wallet before saving", async () => {
    const { wrapper, setLabel } = mountModal(undefined, "")
    expect(wrapper.get("#save-wallet-label").attributes("disabled")).toBeDefined()
    expect(wrapper.find("#wallet-label-error").exists()).toBe(false)
    await wrapper.get("#wallet-label").setValue("  Workshop ")
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()
    expect(setLabel).toHaveBeenCalledWith("Workshop")
  })

  it("displays the translated default and closes without renaming on an unedited save", async () => {
    const gettext = walletTranslations()
    const setLabel = vi.fn(async () => undefined)
    const { wrapper, modal } = mountModal(setLabel, "compte principal", gettext.$gettext)
    expect(wrapper.get<HTMLInputElement>("#wallet-label").element.value).toBe("main")
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()
    expect(setLabel).not.toHaveBeenCalled()
    expect(modal.close).toHaveBeenCalledOnce()
  })

  it("keeps a name saved before the rules when it is not edited", async () => {
    const { wrapper, setLabel, modal } = mountModal(undefined, "Shop/old")
    expect(wrapper.find("#wallet-label-error").exists()).toBe(false)
    expect(wrapper.get("#save-wallet-label").attributes("disabled")).toBeUndefined()
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()
    expect(setLabel).not.toHaveBeenCalled()
    expect(modal.close).toHaveBeenCalledOnce()
  })

  it.each([
    ["a/b", INVALID_CHARACTERS],
    ["atelier'", INVALID_CHARACTERS],
    ["x".repeat(31), "The wallet name must not exceed 30 characters."],
    [" savings ", NOT_UNIQUE],
    ["SAVINGS", NOT_UNIQUE],
  ])("explains why %j is refused while typing", async (label, message) => {
    const { wrapper, setLabel } = mountModal(undefined, "Shop", undefined, ["Savings", "Bank", null])
    await wrapper.get("#wallet-label").setValue(label)
    expect(wrapper.get("#wallet-label-error").text()).toBe(message)
    expect(wrapper.get("#wallet-label").attributes("aria-invalid")).toBe("true")
    expect(wrapper.get("#save-wallet-label").attributes("disabled")).toBeDefined()
    await wrapper.get("#wallet-label-form").trigger("submit")
    await flushPromises()
    expect(setLabel).not.toHaveBeenCalled()
  })

  it.each(["Bank", "Main", "L'atelier", "Caf\u00e9-librairie"])(
    "accepts %j, free in this wallet's currency",
    async (label) => {
      // "Bank" and an unnamed wallet ("Main") exist in the other currency only.
      const { wrapper, setLabel } = mountModal(undefined, "Shop", undefined, ["Savings", "Bank", null])
      await wrapper.get("#wallet-label").setValue(label)
      expect(wrapper.find("#wallet-label-error").exists()).toBe(false)
      await wrapper.get("#save-wallet-label").trigger("click")
      await flushPromises()
      expect(setLabel).toHaveBeenCalledWith(label)
    }
  )

  it("refuses the default name of an unnamed wallet of the same currency", async () => {
    const { wrapper } = mountModal(undefined, "Shop", undefined, [null])
    await wrapper.get("#wallet-label").setValue("Main")
    expect(wrapper.get("#wallet-label-error").text()).toBe(NOT_UNIQUE)
  })

  it("may change only the case of its own name", async () => {
    const { wrapper, setLabel } = mountModal()
    await wrapper.get("#wallet-label").setValue("SHOP")
    expect(wrapper.find("#wallet-label-error").exists()).toBe(false)
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()
    expect(setLabel).toHaveBeenCalledWith("SHOP")
  })

  it("shows the reason when the server refuses the name, until it is edited", async () => {
    const refusal = Object.assign(new Error("refused"), {
      name: "InvalidWalletLabel", reason: "not-unique",
    })
    const setLabel = vi.fn(async () => { throw refusal })
    const { wrapper, modal, msg } = mountModal(setLabel)
    await wrapper.get("#wallet-label").setValue("Workshop")
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()
    expect(wrapper.get("#wallet-label-error").text()).toBe(NOT_UNIQUE)
    expect(msg.error).not.toHaveBeenCalled()
    expect(modal.close).not.toHaveBeenCalled()
    await wrapper.get("#wallet-label").setValue("Workshop 2")
    expect(wrapper.find("#wallet-label-error").exists()).toBe(false)
  })

  it("isolates the label in its own form and saves on submit", async () => {
    const { wrapper, setLabel } = mountModal()
    const label = wrapper.get<HTMLInputElement>("#wallet-label").element
    expect(label.type).toBe("text")
    expect(label.form?.id).toBe("wallet-label-form")
    expect(label.form?.elements.length).toBe(1)
    await wrapper.get("#wallet-label").setValue("Shop 2")
    await wrapper.get("#wallet-label-form").trigger("submit")
    await flushPromises()
    expect(setLabel).toHaveBeenCalledOnce()
    expect(setLabel).toHaveBeenCalledWith("Shop 2")
  })

  it("explains that the name is public before saving", () => {
    const { wrapper } = mountModal()
    expect(wrapper.get("#wallet-label-visibility").text()).toBe(
      "This name is visible to people who pay this wallet."
    )
  })

  it("starts from the current label", () => {
    const { wrapper } = mountModal()

    expect((wrapper.get("#wallet-label").element as HTMLInputElement).value).toBe(
      "Shop"
    )
  })

  it("renames the wallet, then refreshes the accounts and closes", async () => {
    const { wrapper, setLabel, refreshAccounts, modal, msg } = mountModal()

    await wrapper.get("#wallet-label").setValue("Workshop")
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()

    expect(setLabel).toHaveBeenCalledWith("Workshop")
    expect(refreshAccounts).toHaveBeenCalledOnce()
    expect(modal.close).toHaveBeenCalledOnce()
    expect(msg.error).not.toHaveBeenCalled()
  })

  it("reports a failure and stays open", async () => {
    const setLabel = vi.fn(async () => {
      throw new Error("refused")
    })
    const { wrapper, refreshAccounts, modal, msg } = mountModal(setLabel)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await wrapper.get("#wallet-label").setValue("Workshop")
    await wrapper.get("#save-wallet-label").trigger("click")
    await flushPromises()

    expect(msg.error).toHaveBeenCalledWith("The wallet could not be renamed.")
    expect(refreshAccounts).not.toHaveBeenCalled()
    expect(modal.close).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
