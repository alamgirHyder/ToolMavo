import { ref, watch } from "vue";
import {
  detectLanguage,
  preferenceKey,
  languages,
  localeInfo,
  translate,
  formatNumber,
} from "./localization.js";
let storage;
try {
  storage = globalThis.localStorage;
} catch {}
const locale = ref(detectLanguage(storage));
watch(
  locale,
  (code) => {
    const info = localeInfo(code);
    document.documentElement.lang = code;
    document.documentElement.dir = info.dir;
  },
  { immediate: true },
);
function setLanguage(code) {
  if (!languages.some((l) => l.code === code)) return;
  locale.value = code;
  try {
    storage?.setItem(preferenceKey, code);
  } catch {}
}
export function useI18n() {
  return {
    locale,
    languages,
    setLanguage,
    t: (key, params) => translate(locale.value, key, params),
    number: (value, options = {}) => formatNumber(locale.value, value, options),
    date: (value) =>
      new Intl.DateTimeFormat(localeInfo(locale.value).locale).format(
        new Date(value),
      ),
  };
}

export { errorKey, apiFailure } from "./localization.js";
