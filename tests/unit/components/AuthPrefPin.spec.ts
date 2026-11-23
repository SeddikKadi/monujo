import { describe, expect, it, vi } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import AuthPrefPin from "../../../src/components/AuthPrefPin.vue"
import { walletTranslations } from "../helpers/walletTranslations"

async function renderPinForm() {
  const gettext = walletTranslations()
  const handler = {
    toUserConfigJson: vi.fn((pin: string) => ({ pin: `hashed-${pin}` })),
  }
  const wrapper = mount(AuthPrefPin, {
    props: { handler },
    attachTo: document.body,
    global: {
      mocks: { $gettext: gettext.$gettext, $ngettext: gettext.$ngettext },
      stubs: { "fa-icon": true },
    },
  })
  // Let the form take the focus as it does when it opens.
  await flushPromises()
  const [pin, confirmation] = wrapper.findAll("input")
  const [save, cancel] = wrapper.findAll<HTMLButtonElement>(".auth-pref-pin-actions button")
  return { wrapper, handler, pin, confirmation, save, cancel }
}

describe("AuthPrefPin form", () => {
  it("saves a code once it is typed twice", async () => {
    const { wrapper, handler, pin, confirmation, save } = await renderPinForm()
    expect(wrapper.findAll("label").map(label => label.text()))
      .toEqual(["New PIN code", "Confirmation"])
    expect(pin.attributes("id")).toBe(wrapper.findAll("label")[0].attributes("for"))
    expect(confirmation.attributes("id")).toBe(wrapper.findAll("label")[1].attributes("for"))
    expect(save.element.disabled).toBe(true)
    expect(document.activeElement).toBe(pin.element)

    await pin.setValue("1234")
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(confirmation.element)
    await confirmation.setValue("1234")
    await wrapper.vm.$nextTick()
    expect(wrapper.find(".help.is-danger").exists()).toBe(false)
    expect(save.element.disabled).toBe(false)
    expect(document.activeElement).toBe(save.element)

    await save.trigger("click")
    expect(handler.toUserConfigJson).toHaveBeenCalledWith("1234")
    expect(wrapper.emitted("submitConfig")).toEqual([[{ pin: "hashed-1234" }]])
    wrapper.unmount()
  })

  it("explains a different confirmation and does not save", async () => {
    const { wrapper, handler, pin, confirmation, save } = await renderPinForm()
    await pin.setValue("1234")
    await confirmation.setValue("123")
    expect(wrapper.find(".help.is-danger").exists()).toBe(false)
    await confirmation.setValue("1235")
    expect(wrapper.get(".help.is-danger").text()).toBe("Given PINs are different")
    expect(save.element.disabled).toBe(true)
    ;(wrapper.vm as any).submitConfig()
    expect(handler.toUserConfigJson).not.toHaveBeenCalled()
    expect(wrapper.emitted("submitConfig")).toBeUndefined()
    wrapper.unmount()
  })

  it("asks for four digits", async () => {
    const { wrapper, pin, confirmation, save } = await renderPinForm()
    await pin.setValue("12ab")
    await confirmation.setValue("12ab")
    expect(wrapper.get(".help.is-danger").text()).toBe("PIN code must contain 4 digits")
    expect(save.element.disabled).toBe(true)
    wrapper.unmount()
  })

  it("lets the user give up", async () => {
    const { wrapper, cancel } = await renderPinForm()
    await cancel.trigger("click")
    expect(wrapper.emitted("cancel")).toHaveLength(1)
    expect(wrapper.emitted("submitConfig")).toBeUndefined()
    wrapper.unmount()
  })
})
