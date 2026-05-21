<template>
  <div v-if="isBusinessForFinanceBackend" class="badge">pro</div>
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  @Options({
    name: "Badge",
    props: {
      object: Object,
      refreshToggle: Boolean,
    },
    data: () => {
      return {
        isBusinessForFinanceBackend: false,
      }
    },
    async mounted() {
      await this.getBusinessForFinanceBackend()
    },
    methods: {
      async getBusinessForFinanceBackend() {
        if (typeof this.object.isBusinessForFinanceBackend == "function") {
          this.isBusinessForFinanceBackend =
            await this.object.isBusinessForFinanceBackend()
        } else if (
          typeof this.object._obj.isBusinessForFinanceBackend == "function"
        ) {
          this.isBusinessForFinanceBackend =
            await this.object._obj.isBusinessForFinanceBackend()
        } else {
          this.isBusinessForFinanceBackend = false
        }
      },
    },
    watch: {
      object: async function () {
        await this.getBusinessForFinanceBackend()
      },
      refreshToggle: async function () {
        await this.getBusinessForFinanceBackend()
      },
    },
  })
  export default class Badge extends Vue {}
</script>
<style lang="scss" scoped>
  @import "../assets/custom-variables";

  div.badge {
    vertical-align: top;
    margin-left: 0.5em;
    display: inline;
    border-radius: 1em;
    font-size: 0.6em;
    padding: 0em 0.5em;
    background-color: $color-2;
    color: white;
    font-weight: bold;
  }
</style>
