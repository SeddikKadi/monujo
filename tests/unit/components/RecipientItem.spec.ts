import { describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import { reactive } from "vue"
import Recipient from "@lokavaluto/lokapi/build/backend/odoo/recipient"
import RecipientItem from "../../../src/components/RecipientItem.vue"

import { walletTranslations } from "../helpers/walletTranslations"

vi.mock("@/utils/showSpinner", () => ({
  showSpinnerMethod: () => (fn: unknown) => fn,
  replaceWithLoader: () => undefined,
}))
vi.mock("@/utils/debounce", () => ({ debounceMethod: (fn: unknown) => fn }))

function renderRecipient(
  walletLabel?: string,
  gettext = (message: string) => message,
  hasSiblingWallets = false
) {
  const recipient = { name: "Alice", walletLabel, hasSiblingWallets }
  const wrapper = mount(RecipientItem, {
    props: { recipient },
    global: {
      mocks: { $config: { disableBadges: true }, $gettext: gettext },
      stubs: { Badge: true },
    },
  })
  return { wrapper, recipient }
}

describe("RecipientItem public wallet name", () => {
  it("updates default labels when the payer changes language", async () => {
    const gettext = walletTranslations()
    const { wrapper, recipient } = renderRecipient("compte principal", gettext.$gettext)
    expect(wrapper.get(".wallet-label").text()).toBe("main")
    gettext.current = "fr-FR"
    await wrapper.vm.$nextTick()
    expect(wrapper.get(".wallet-label").text()).toBe("compte principal")
    expect(recipient.walletLabel).toBe("compte principal")
  })

  it("distinguishes wallets belonging to the same person", async () => {
    const { wrapper, recipient } = renderRecipient("Shop")
    const second = renderRecipient("Personal").wrapper
    expect(wrapper.text()).toContain("Alice")
    expect(wrapper.get(".wallet-label").text()).toBe("Shop")
    expect(second.get(".wallet-label").text()).toBe("Personal")
    await wrapper.get(".recipient-name").trigger("click")
    expect(wrapper.emitted("select")?.[0]).toEqual([recipient])
  })

  it("keeps the partner name without an empty label row for older data", () => {
    const { wrapper } = renderRecipient()
    expect(wrapper.text()).toContain("Alice")
    expect(wrapper.find(".wallet-label").exists()).toBe(false)
  })

  it("names an unnamed wallet listed with other wallets of the same person", () => {
    const unnamed = renderRecipient(undefined, undefined, true).wrapper
    const named = renderRecipient("Shop", undefined, true).wrapper
    expect(unnamed.get(".wallet-label").text()).toBe("Main")
    expect(named.get(".wallet-label").text()).toBe("Shop")
  })

  it("renders labels as text, including long names", () => {
    const label = "<b>Shop & workshop</b>"
    const { wrapper } = renderRecipient(label)
    expect(wrapper.get(".wallet-label").text()).toBe(label)
    expect(wrapper.find(".wallet-label b").exists()).toBe(false)
  })
})

describe("RecipientItem favorite", () => {
  /** Two wallets of one person, as LokAPI makes them from one search row. */
  function renderSiblings(odoo: Record<string, unknown>) {
    const $post = vi.fn(async () => ({}))
    const Base = Recipient as unknown as new (...args: unknown[]) => any
    class TestRecipient extends Base {
      async prepareTransfer() {
        return []
      }
    }
    const data = reactive({ odoo: { name: "Alice", ...odoo } })
    return {
      $post,
      rows: ["shop", "savings"].map((ident) => {
        const recipient = new TestRecipient(
          {},
          { uri: "comchain://Test", internalId: "comchain:Test" },
          data
        )
        recipient.ident = ident
        recipient.fromUserAccount = { lccApi: { $post } }
        return mount(RecipientItem, {
          props: { recipient: reactive(recipient) },
          global: {
            mocks: {
              $config: { disableBadges: true },
              $gettext: (message: string) => message,
            },
            stubs: { Badge: true },
          },
        })
      }),
    }
  }
  const starred = (rows: ReturnType<typeof renderSiblings>["rows"]) =>
    rows.map((row) => row.get("#toggle-fav").classes().includes("is-active"))

  it("stars only the wallet clicked, not the other wallets of its owner", async () => {
    const { rows, $post } = renderSiblings({
      wallet_favorites: { "comchain:Test": ["savings"] },
    })
    expect(starred(rows)).toEqual([false, true])

    await rows[0].get("#toggle-fav").trigger("click")
    await flushPromises()
    expect($post).toHaveBeenCalledWith(
      "/wallet/shop/favorite/set",
      null,
      "wallet/0"
    )
    expect(starred(rows)).toEqual([true, true])

    await rows[1].get("#toggle-fav").trigger("click")
    await flushPromises()
    expect(starred(rows)).toEqual([true, false])
  })
})
