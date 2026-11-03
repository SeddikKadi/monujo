import { createGettext } from "vue3-gettext"

export function walletTranslations() {
  const gettext = createGettext({
    availableLanguages: { en: "English", "fr-FR": "Français" },
    defaultLanguage: "en",
    translations: {
      "fr-FR": {
        main: "compte principal",
      },
    },
  })
  gettext.muted = ["en", "fr-FR"]
  return gettext
}
