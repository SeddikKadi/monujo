<template>
  <div v-if="menuItems.length > 1" class="dropdown">
    <div ref="trigger" class="dropdown-trigger">
      <span
        class="
          button
          is-default
          button-contextual-menu
          is-pulled-right is-rounded
          ml-2
        "
        aria-haspopup="true"
        :aria-controls="`dropdown-${object.dropDownId}-menu`"
        @click.stop="toggleDropdown"
      >
        <span class="icon">
          <fa-icon icon="ellipsis-v" />
        </span>
      </span>
    </div>
    <div
      v-if="isDropdownOpen"
      ref="menu"
      class="dropdown-menu contextual-dropdown-menu"
      :id="`dropdown-${object.dropDownId}-menu`"
      role="menu"
      @click.stop="closeDropdown"
    >
      <div class="dropdown-content">
        <a
          v-for="item in menuItems"
          :key="item.label"
          href="#"
          class="dropdown-item is-flex"
          @click.prevent="item.action(this)"
        >
          <div class="mr-1 icon-container">
            <fa-icon :icon="item.icon" />
          </div>
          <div class="is-small ml-1 item-label">{{ item.label }}</div>
        </a>
      </div>
    </div>
  </div>
  <span
    v-else-if="menuItems.length === 1"
    class="
      button
      is-default
      button-contextual-menu
      is-pulled-right is-rounded
      ml-2
    "
    @click="menuItems[0].action(this)"
  >
    <span class="icon">
      <fa-icon :icon="menuItems[0].icon" />
    </span>
  </span>
  <span
    class="
      button
      is-default
      button-contextual-menu
      is-pulled-right is-rounded
      ml-2
      hide
    "
    v-else
  >
    <!-- placeholder -->
    <span class="icon">
      <fa-icon class="qrcode-icon" icon="ellipsis-v" />
    </span>
  </span>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  @Options({
    name: "DropdownMenu",
    props: {
      object: Object,
    },
    data() {
      return {
        isDropdownOpen: false,
      }
    },
    computed: {
      menuItems(): any[] {
        return this.$dropdownMenu.listItems(this.object)
      },
    },
    watch: {
      menuItems() {
        if (this.menuItems.length < 2) this.closeDropdown()
      },
    },
    mounted() {
      document.addEventListener("click", this.closeDropdown)
      document.addEventListener("scroll", this.closeDropdown, true)
      window.addEventListener("resize", this.positionDropdown)
    },
    beforeUnmount() {
      document.removeEventListener("click", this.closeDropdown)
      document.removeEventListener("scroll", this.closeDropdown, true)
      window.removeEventListener("resize", this.positionDropdown)
    },
    methods: {
      closeDropdown() {
        this.isDropdownOpen = false
      },
      async toggleDropdown() {
        this.isDropdownOpen = !this.isDropdownOpen
        await this.$nextTick()
        this.positionDropdown()
      },
      positionDropdown() {
        const menu = this.$refs.menu as HTMLElement | undefined
        if (!menu) return

        const { left, bottom } = (
          this.$refs.trigger as HTMLElement
        ).getBoundingClientRect()
        menu.style.top = `${bottom + 4}px`
        menu.style.left = `${Math.max(
          8,
          Math.min(
            left,
            document.documentElement.clientWidth -
              menu.getBoundingClientRect().width -
              8
          )
        )}px`
      },
    },
  })
  export default class DropdownMenu extends Vue {}
</script>
<style lang="scss" scoped>
  .dropdown-item {
    font-size: 1em;
    -webkit-user-select: none; /* Chrome, Safari, Opera */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Standard syntax */
  }
  .contextual-dropdown-menu {
    font-size: 1rem;
    display: block;
    position: fixed;
    width: max-content;
    min-width: 0;
    max-width: max(23em, calc(100% - 16px));
    padding: 0;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.16);
    z-index: 100; // Above modal cards, including nested modals.

    .dropdown-item {
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
      white-space: normal;
      text-align: left;
      transition: background-color 150ms ease;

      &:hover,
      &:focus-visible {
        background-color: rgba(0, 0, 0, 0.2);
      }
    }
  }
  .item-label {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .icon-container {
    width: 1em;
    flex-shrink: 0;
  }
</style>
