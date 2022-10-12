<template>
  <div class="main">
    <div class="is-flex">
      <div class="is-flex mb-5">
        <div class="switch-centered">
          <label class="switch">
            <input
              type="checkbox"
              :checked="useCustomLanguage"
              @click="switchCustomLanguage"
              ref="langCheckbox"
            />
            <span class="slider round"></span>
          </label>
        </div>
        <div class="mr-1 switch-centered">
          {{ $gettext("Use biometry for login") }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import { markRaw } from "vue"
  import { Options, Vue } from "vue-class-component"
  @Options({
    name: "BiometryPrefs",
    components: {},
    props: {},
    data() {
      return {
        userBiometric: false,
      }
    },
    mounted() {},
    methods: {},
  })
  export default class BiometryPrefs extends Vue {}
</script>
<style lang="scss" scoped>
  @import "@/assets/custom-variables";
  @import "@/assets/switch-prefs";

  .custom-card-prefs {
    max-width: 550px;
    margin: auto;
  }
  .switch-centered {
    padding-right: 7px;
  }
</style>
