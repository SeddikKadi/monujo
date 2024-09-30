import { createApp } from "vue"
import Loading from "vue-loading-overlay"
import "vue-loading-overlay/dist/css/index.css"

export function showSpinnerMethod(selector: string) {
  return function <T extends (this: any, ...args: any[]) => Promise<any>>(
    fn: T
  ): T {
    return async function (
      this: any,
      ...args: Parameters<T>
    ): Promise<ReturnType<T>> {
      let element: HTMLElement | null = null
      if (this && this.$el && this.$el instanceof HTMLElement) {
        element = this.$el?.querySelector(selector)
        if (!element) element = document.querySelector(selector)
      } else {
        // Fallback to document if this.$el is not available
        element = document.querySelector(selector)
      }
      if (!element) {
        console.error(`Element ${selector} not found.`)
        return await fn.apply(this, args)
      }

      // Create an element to mount the loading component
      const loadingElement = document.createElement("div")

      // Append the loading element to the target element
      element.prepend(loadingElement)

      // Create and mount the loading component
      const loadingApp = createApp(Loading, {
        // Pass any props you need for the loading component
        // For example: isFullPage: false
        active: true,
        isFullPage: false,
        width: "75px",
        height: "75px",
      })
      // Mount the loading component to the loadingElement
      loadingApp.mount(loadingElement)
      try {
        // Execute the original async function
        const result = await fn.apply(this, args)
        return result
      } catch (error: any) {
        // Handle errors if necessary
        console.log(error)
        throw error
      } finally {
        loadingElement.remove()
      }
    } as unknown as T
  }
}

// XXXvlab: use any[]
export function showSpinner(selector: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    return showSpinnerMethod(selector)(descriptor.value)
  }
}
