<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <template v-if="$modal.step.value == 1">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title is-title-shrink">
            {{ $gettext("Recipient Selector") }} - 1/2
          </p>
          <button
            class="delete"
            aria-label="close"
            @click="$modal.close()"
          ></button>
        </header>
        <RecipientSelector
          :showAll="true"
          purpose="inspect"
          @clickRecipient="handleClickRecipient"
          :currency="currency"
        />
        <footer class="modal-card-foot is-justify-content-flex-end"></footer>
      </div>
    </template>
    <template v-if="$modal.step.value == 2">
      <div class="modal-card" tabindex="0">
        <header class="modal-card-head">
          <span class="is-flex is-flex-shrink-0">
            <a class="mr-3 is-flex" @click="$modal.back()">
              <span class="icon has-text-white">
                <fa-icon icon="arrow-left" class="fa-lg" />
              </span>
            </a>
          </span>
          <p class="modal-card-title is-title-shrink">
            {{ $gettext("Recipient Info") }}
          </p>
          <button
            class="delete"
            aria-label="close"
            @click="$modal.close()"
          ></button>
        </header>
        <section class="modal-card-body">
          <RecipientInfo :recipient="recipient" />
        </section>
        <footer class="modal-card-foot is-justify-content-flex-end"></footer>
      </div>
    </template>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"

  import RecipientSelector from "@/components/RecipientSelector.vue"
  import RecipientInfo from "@/components/RecipientInfo.vue"

  @Options({
    name: "InspectRecipientModal",
    components: {
      RecipientSelector,
      RecipientInfo,
    },
    data() {
      return {
        recipient: null,
        currency: null,
      }
    },
    created() {
      const [opts] = this.$modal.args.value
      this.currency = opts.currency
    },
    methods: {
      handleClickRecipient(data: any): void {
        this.recipient = data.recipient
        this.$modal.next()
      },
    },
  })
  export default class InspectRecipientModal extends Vue {}
</script>
<style lang="scss" scoped>
  .modal-card-body {
    min-height: 120px;
  }
</style>
