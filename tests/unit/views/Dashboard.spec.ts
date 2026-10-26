import { describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import { defineComponent, reactive } from "vue"
import Dashboard from "../../../src/views/Dashboard.vue"

const AccountListStub = defineComponent({
  name: "TheBankAccountList",
  props: ["account"],
  emits: ["accountSelected"],
  template: "<div />",
})
const FooterStub = defineComponent({
  name: "TheDashboardFooter",
  props: ["account"],
  template: "<div />",
})

function wallet(id: string, available = true) {
  return { id, active: available, isActiveAccount: available, _obj: { internalId: id } }
}

/** Dashboard on a store whose account list can be replaced, like refreshes do. */
async function mountDashboard(accounts: any[], remembered: string | null = null) {
  const state = reactive({
    lokapi: { virtualAccountTree: accounts, accountsLoading: false },
  })
  const getters = {
    get availableVirtualAccounts() {
      return state.lokapi.virtualAccountTree.filter(
        (a: any) => a.active && a.isActiveAccount
      )
    },
  }
  const settings: any = { selectedWalletId: remembered }
  const localSettings = {
    load: vi.fn(async () => ({ ...settings })),
    save: vi.fn(async (newSettings: any) => Object.assign(settings, newSettings)),
  }
  const wrapper = mount(Dashboard, {
    global: {
      stubs: {
        TheBankAccountList: AccountListStub,
        TheTransactionList: true,
        TheDashboardFooter: FooterStub,
      },
      mocks: {
        $store: { state, getters },
        $localSettings: localSettings,
        $gettext: (message: string) => message,
      },
    },
  })
  await flushPromises()
  const refresh = async (newAccounts: any[]) => {
    state.lokapi.virtualAccountTree = newAccounts
    await flushPromises()
  }
  const selected = () => wrapper.findComponent(FooterStub).props("account")
  return { wrapper, refresh, selected, settings }
}

describe("Dashboard wallet selection", () => {
  it.each([null, "previous-user-wallet"])(
    "leaves the transaction column empty for a pending-only wallet, with remembered selection %j",
    async remembered => {
      const pending = { ...wallet("new", false), status: "to_confirm" }
      const { wrapper, selected } = await mountDashboard([pending], remembered)
      expect(selected()).toBeNull()
      expect(wrapper.get(".columns > .column:last-child").element.children).toHaveLength(0)
      expect(wrapper.get(".columns > .column:last-child").text()).toBe("")
    }
  )

  it("leaves the transaction column empty when there are no wallets", async () => {
    const { wrapper, selected } = await mountDashboard([])
    expect(selected()).toBeNull()
    expect(wrapper.get(".columns > .column:last-child").element.children).toHaveLength(0)
  })

  it("selects the first available wallet by default and remembers it", async () => {
    const { selected, settings } = await mountDashboard([wallet("a"), wallet("b")])

    expect(selected().id).toBe("a")
    expect(settings.selectedWalletId).toBe("a")
  })

  it("selects the wallet remembered from the previous session", async () => {
    const { selected } = await mountDashboard([wallet("a"), wallet("b")], "b")

    expect(selected().id).toBe("b")
  })

  it("selects the first wallet when the remembered one is not available", async () => {
    const { selected } = await mountDashboard([wallet("a"), wallet("b")], "gone")

    expect(selected().id).toBe("a")
  })

  it("selects the default once the accounts are loaded", async () => {
    const { selected, refresh } = await mountDashboard([])
    expect(selected()).toBeNull()

    await refresh([wallet("a"), wallet("b")])

    expect(selected().id).toBe("a")
  })

  it("keeps the selected wallet, as its new object, after a refresh", async () => {
    const { wrapper, selected, refresh } = await mountDashboard([
      wallet("a"),
      wallet("b"),
    ])
    wrapper.findComponent(AccountListStub).vm.$emit("accountSelected", wallet("b"))
    await flushPromises()
    const refreshedB = { ...wallet("b"), bal: "12.00" }

    await refresh([wallet("a"), refreshedB])

    expect(selected().id).toBe("b")
    expect(selected().bal).toBe("12.00")
  })

  it("does not switch to another wallet when the selected one becomes unavailable", async () => {
    const { wrapper, selected, refresh, settings } = await mountDashboard([
      wallet("a"),
      wallet("b"),
    ])
    wrapper.findComponent(AccountListStub).vm.$emit("accountSelected", wallet("b"))
    await flushPromises()

    await refresh([wallet("a"), wallet("b", false)])

    expect(selected()).toBeNull()
    expect(wrapper.get(".columns > .column:last-child").element.children).toHaveLength(0)
    expect(settings.selectedWalletId).toBe("b")

    await refresh([wallet("a"), wallet("b")])

    expect(selected().id).toBe("b")
    expect(wrapper.findComponent({ name: "TheTransactionList" }).exists()).toBe(true)
  })
})
