import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import TheBankAccountList from "@/components/TheBankAccountList.vue"

let getters: Record<string, any>
let moduleState: Record<string, any>

vi.mock("vuex", () => ({
  mapGetters: (names: string[]) => {
    const res: Record<string, any> = {}
    names.forEach((name) => {
      res[name] = () => getters[name]
    })
    return res
  },
  mapState: () => ({}),
}))

vi.mock("@/utils/vuex", () => ({
  mapModuleState: (_module: string, names: string[]) => {
    const res: Record<string, any> = {}
    names.forEach((name) => {
      res[name] = () => moduleState[name]
    })
    return res
  },
}))

const createStoreMock = (virtualAccountTreeLength: number) => ({
  state: {
    lokapi: {
      virtualAccountTree: new Array(virtualAccountTreeLength),
    },
  },
  dispatch: vi.fn(),
})

const mountComponent = (account: any = undefined) =>
  mount(TheBankAccountList, {
    props: { account },
    global: {
      stubs: {
        BankAccountItem: true,
        Loading: true,
        "fa-icon": true,
      },
      mocks: {
        $gettext: (msg: string) => msg,
        $config: { accountsRefreshInterval: -1 },
        $store: createStoreMock(1),
      },
    },
  })

describe("TheBankAccountList.vue - pathological accounts", () => {
  beforeEach(() => {
    getters = {
      availableVirtualAccounts: [],
      activeVirtualAccounts: [],
      pendingVirtualAccounts: [],
      inactiveVirtualAccounts: [],
      pathologicalVirtualAccounts: [],
      getBackends: () => [],
      getUnconfiguredBackends: () => [],
    }

    moduleState = {
      accountsLoading: false,
      accountsLoadingErrors: [],
    }
  })

  const makeAccount = (id: string, overrides: Record<string, any> = {}) => ({
    active: true,
    status: "active",
    isActiveAccount: true,
    isActiveAccountSupported: true,
    _obj: { internalId: id },
    name: () => id,
    ...overrides,
  })

  it("shows 'your accounts' when active accounts exist and no pathological accounts", () => {
    const activeAccount = makeAccount("A")
    getters.availableVirtualAccounts = [activeAccount]
    getters.activeVirtualAccounts = [activeAccount]
    getters.pathologicalVirtualAccounts = []

    const wrapper = mountComponent(activeAccount)

    expect(wrapper.text()).toContain("your accounts")
    expect(wrapper.text()).not.toContain("Disabled accounts")
  })

  it("shows both 'your accounts' and 'Disabled accounts' sections when both active and pathological accounts exist", () => {
    const activeAccount = makeAccount("A")
    const pathologicalAccount = makeAccount("Broken", {
      status: "active",
      isActiveAccount: false,
    })
    getters.availableVirtualAccounts = [activeAccount]
    getters.activeVirtualAccounts = [activeAccount]
    getters.pathologicalVirtualAccounts = [pathologicalAccount]

    const wrapper = mountComponent(activeAccount)

    expect(wrapper.text()).toContain("your accounts")
    expect(wrapper.text()).toContain("Disabled accounts")
  })

  it("shows only 'Disabled accounts' section when only pathological accounts exist", () => {
    const pathologicalAccount = makeAccount("Broken", {
      status: "active",
      isActiveAccount: false,
    })
    getters.availableVirtualAccounts = []
    getters.activeVirtualAccounts = []
    getters.pathologicalVirtualAccounts = [pathologicalAccount]

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain("Disabled accounts")
    expect(wrapper.text()).not.toContain("your accounts")
  })

  it("renders correct number of BankAccountItems for both active and pathological accounts", () => {
    const activeAccounts = [makeAccount("Active")]
    const pathologicalAccounts = [
      makeAccount("Broken 1", { status: "active", isActiveAccount: false }),
      makeAccount("Broken 2", { status: "active", isActiveAccount: false }),
    ]
    getters.availableVirtualAccounts = activeAccounts
    getters.activeVirtualAccounts = activeAccounts
    getters.pathologicalVirtualAccounts = pathologicalAccounts

    const wrapper = mountComponent()

    const accountItems = wrapper.findAllComponents({ name: "BankAccountItem" })
    expect(accountItems.length).toBe(activeAccounts.length + pathologicalAccounts.length)
  })

  it("shows 'your pending accounts' section for to_confirm accounts", () => {
    const pendingAccount = makeAccount("Pending", {
      active: false,
      status: "to_confirm",
      isActiveAccount: false,
    })
    getters.pendingVirtualAccounts = [pendingAccount]

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain("your pending accounts")
  })

  it("shows 'Inactive accounts' section for inactive/blocked accounts", () => {
    const inactiveAccount = makeAccount("Inactive", {
      active: false,
      status: "inactive",
      isActiveAccount: false,
    })
    getters.inactiveVirtualAccounts = [inactiveAccount]

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain("Inactive accounts")
    expect(wrapper.text()).toContain("These accounts were disabled")
  })

  it("shows all three sections when accounts span pending, inactive, and pathological", () => {
    const activeAccount = makeAccount("A")
    const pendingAccount = makeAccount("Pending", {
      active: false,
      status: "to_confirm",
    })
    const inactiveAccount = makeAccount("Blocked", {
      active: false,
      status: "blocked",
      isActiveAccount: false,
    })
    const pathologicalAccount = makeAccount("Desync", {
      status: "active",
      isActiveAccount: false,
    })

    getters.availableVirtualAccounts = [activeAccount]
    getters.activeVirtualAccounts = [activeAccount]
    getters.pendingVirtualAccounts = [pendingAccount]
    getters.inactiveVirtualAccounts = [inactiveAccount]
    getters.pathologicalVirtualAccounts = [pathologicalAccount]

    const wrapper = mountComponent(activeAccount)

    expect(wrapper.text()).toContain("your accounts")
    expect(wrapper.text()).toContain("your pending accounts")
    expect(wrapper.text()).toContain("Inactive accounts")
    expect(wrapper.text()).toContain("Disabled accounts")
  })
})
