import { describe, it, expect, vi } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createStore } from "vuex"
import TheCurrencyList from "@/components/TheCurrencyList.vue"
import PendingAccounts from "@/components/PendingAccounts.vue"
import PendingCredits from "@/components/PendingCredits.vue"
import AdminDashboard from "@/views/AdminDashboard.vue"

vi.mock("@/utils/showSpinner", async () => ({
  ...await vi.importActual<any>("@/utils/showSpinner"),
  showSpinnerMethod: () => (fn: any) => fn,
  replaceWithLoader: vi.fn(),
}))
const gettext = (s: string) => s
function wallet(ident: string, rights = false) {
  return {
    uri: `comchain://Test/user/${ident}`, internalId: `comchain:${ident}`,
    label: ident, parent: {internalId: "comchain:Test"},
    getCurrencySupply: vi.fn(),
    hasUserAccountValidationRights: vi.fn(async () => rights),
    hasCreditRequestValidationRights: vi.fn(async () => rights),
    canSearchAllRecipients: vi.fn(async () => rights),
    getStagingUserAccounts: vi.fn(async () => [] as any[]),
    getCreditRequests: vi.fn(async () => [] as any[]),
  }
}

describe("admin wallet selection", () => {
  it("lists eligible wallets only and distinguishes two admins in the same currency", async () => {
    const personal = wallet("personal"), admin = wallet("admin", true), other = wallet("other", true)
    const wrapper = mount(TheCurrencyList, {global:{
      mocks: {$gettext:gettext, $config:{currenciesRefreshInterval:-1}, $lokapi:{
        getBackends: async () => ({test:{userAccounts:{personal,admin,other}}}),
      }}, stubs:{CurrencyItem:true,loading:true},
    }})
    await flushPromises()
    const entries = (wrapper.vm as any).adminUserAccounts
    expect(entries.map((e: any) => e.userAccount.internalId)).toEqual([admin.internalId, other.internalId])
    expect(entries.every((e: any) => e.showAccountId)).toBe(true)
    expect(wrapper.emitted("currencySelected")?.[0][0]).toEqual(admin)
    wrapper.unmount()
  })

  it("does not list a wallet that can only search recipients", async () => {
    const searchOnly = wallet("searchOnly"), admin = wallet("admin", true)
    searchOnly.canSearchAllRecipients.mockResolvedValue(true)
    const wrapper = mount(TheCurrencyList, {global:{
      mocks: {$gettext:gettext, $config:{currenciesRefreshInterval:-1}, $lokapi:{
        getBackends: async () => ({test:{userAccounts:{searchOnly,admin}}}),
      }}, stubs:{CurrencyItem:true,loading:true},
    }})
    await flushPromises()
    const entries = (wrapper.vm as any).adminUserAccounts
    expect(entries.map((e: any) => e.userAccount.internalId)).toEqual([admin.internalId])
    expect(entries[0].showAccountId).toBe(false)
    wrapper.unmount()
  })

  it("does not let a slow permission result restore a previously selected admin", async () => {
    let resolve!: (value: boolean) => void
    const old = wallet("old", true), selected = wallet("selected", false)
    old.hasUserAccountValidationRights.mockImplementation(() => new Promise<boolean>(r => {resolve=r}))
    const store = createStore({modules:{lokapi:{state:{adminRightsLoaded:true}}},getters:{hasAnyAdminRights:()=>true}})
    const wrapper = mount(AdminDashboard, {global:{plugins:[store],mocks:{$gettext:gettext},
      stubs:{TheCurrencyList:true,TheDashboardFooter:true,PendingAccounts:true,PendingCredits:true},
    }})
    const vm = wrapper.vm as any
    const first = vm.currencySelected(old)
    await vm.currencySelected(selected)
    resolve(true)
    await first
    expect(vm.currency.uri).toBe(selected.uri)
    expect(vm.canValidateWallets).toBe(false)
    expect(vm.canValidateCredits).toBe(false)
    expect(wrapper.findComponent(PendingAccounts).exists()).toBe(false)
    wrapper.unmount()
  })
})

describe("pending items use the selected admin wallet", () => {
  it("renders two pending wallets of one partner as separate rows and validates the clicked one", async () => {
    const admin = wallet("admin", true)
    const first = {id:1,internalId:"comchain://Test/a",name:"Alice",walletLabel:"Shop",validateCreation:vi.fn(async()=>{})}
    const second = {...first,internalId:"comchain://Test/b",walletLabel:"Office",validateCreation:vi.fn(async()=>{})}
    admin.getStagingUserAccounts.mockResolvedValue([first, second])
    const wrapper = mount(PendingAccounts, {props:{adminWallet:admin},global:{
      mocks:{$gettext:gettext,$msg:{success:vi.fn()}},stubs:{"fa-icon":true},
    }})
    await flushPromises()
    const rows = wrapper.findAll(".account-row")
    expect(rows).toHaveLength(2)
    expect(rows[0].attributes("data-wallet-id")).not.toBe(rows[1].attributes("data-wallet-id"))
    expect(rows[1].text()).toContain("Office")
    await rows[1].get(".validate-account").trigger("click")
    await flushPromises()
    expect(second.validateCreation).toHaveBeenCalledOnce()
    expect(first.validateCreation).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it("loads credit requests through the selected issuer", async () => {
    const admin = wallet("admin", true)
    admin.getCreditRequests.mockResolvedValue([{jsonData:{odoo:{credit_id:9}}}])
    const wrapper = mount(PendingCredits, {props:{adminWallet:admin},global:{
      mocks:{$gettext:gettext}, stubs:{TransactionItem:true},
    }})
    await flushPromises()
    expect(admin.getCreditRequests).toHaveBeenCalledOnce()
    expect(wrapper.emitted("hasCredits")?.[0]).toEqual([true])
    wrapper.unmount()
  })
})
