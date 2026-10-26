import { afterEach, describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import TransactionListRecent from "../../../src/components/TransactionListRecent.vue"

let wrapper: ReturnType<typeof mount>
afterEach(() => wrapper?.unmount())

describe("TransactionListRecent", () => {
  it("shows the empty-history message after loading the selected wallet's transactions", async () => {
    const getTransactions = vi.fn(async function* () {})
    wrapper = mount(TransactionListRecent, {
      attachTo: document.body,
      props: { account: { _obj: { getTransactions } } },
      global: {
        mocks: { $gettext: (message: string) => message },
        stubs: { TransactionItem: true },
      },
    })
    await flushPromises()

    expect(getTransactions).toHaveBeenCalledOnce()
    expect(wrapper.get("#the-transaction-list").text()).toContain("Transactions")
    expect(wrapper.get(".notification.is-default").text()).toBe(
      "No previous transactions in your history."
    )
    expect(wrapper.findComponent({ name: "TransactionItem" }).exists()).toBe(false)
  })
})
