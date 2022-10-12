<template>
<div class="modal is-active centered" v-if="visible">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
      <span class="is-flex is-flex-shrink-0"> </span>
      <p class="modal-card-title is-title-shrink">
        {{ opts.title }}
      </p>
      <button
        class="delete"
        aria-label="close"
        @click="cancelInput()"
        ></button>
    </header>
    <section class="modal-card-body">
      <p>
        {{ opts.content }}
      </p>
      </section>
    <footer class="modal-card-foot is-justify-content-flex-end">
      {{ opts.buttons }}
    </footer>
    </div>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  @Options({
    name: "Dialog",
    components: {
    },
    data() {
      return {
        visible: false,
        callbacks: {},
      }
    },

    created() {
      this.$dialog.register(
        (opts: any) =>
          new Promise((resolve, reject) => {
            this.callbacks = { resolve, reject }
            this.show(opts: any)
          })
      )
    },
    methods: {
      submitInput(credsInput: string) {
        this.hide()
        this.callbacks.resolve(credsInput)
      },

      cancelInput(error?: any) {
        this.hide()
        this.$msg.warning(this.$gettext("Operation canceled"))
        this.callbacks.reject(
          error || new Error("User canceled the dialog box")
        )
      },

      hide() {
        this.visible = false
      },

      show() {
        this.opts = opts
        this.visible = true
      },
    },
  })
  export default class Dialog extends Vue {}
</script>
<style lang="scss" scoped>
  .modal-card {
    position: relative;
    top: -5vh;
  }
</style>
