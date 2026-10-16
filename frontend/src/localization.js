import { de, ur, dictionaries } from "./locales/messages.js";
export const languages = [
  { code: "en", name: "English", locale: "en-US", dir: "ltr" },
  { code: "de", name: "Deutsch", locale: "de-DE", dir: "ltr" },
  { code: "ur", name: "اردو", locale: "ur-PK", dir: "rtl" },
  { code: "ar", name: "العربية", locale: "ar-SA", dir: "rtl" },
  { code: "hi", name: "हिन्दी", locale: "hi-IN", dir: "ltr" },
  { code: "bn", name: "বাংলা", locale: "bn-BD", dir: "ltr" },
  { code: "zh", name: "简体中文", locale: "zh-CN", dir: "ltr" },
  { code: "es", name: "Español", locale: "es-ES", dir: "ltr" },
  { code: "fr", name: "Français", locale: "fr-FR", dir: "ltr" },
  { code: "pt", name: "Português", locale: "pt-BR", dir: "ltr" },
  { code: "ru", name: "Русский", locale: "ru-RU", dir: "ltr" },
  { code: "ja", name: "日本語", locale: "ja-JP", dir: "ltr" },
];
export const preferenceKey = "toolmavo.language";
export function supportedLanguage(value) {
  if (typeof value !== "string") return null;
  const code = value.toLowerCase().split(/[-_]/)[0];
  return languages.some((l) => l.code === code) ? code : null;
}
export function detectLanguage(storage) {
  try {
    const saved = supportedLanguage(storage?.getItem(preferenceKey));
    if (saved) return saved;
  } catch {}
  return "en";
}
export function translate(language, key, params = {}) {
  const normalized = String(key).replace(/\s+/g, " ").trim();
  const dictionary = dictionaries[language];
  const message = dictionary?.[normalized] ?? normalized;
  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}
export function localeInfo(code) {
  return languages.find((l) => l.code === code) || languages[0];
}
export function formatNumber(code, value, options = {}) {
  return new Intl.NumberFormat(localeInfo(code).locale, options).format(
    Number(value),
  );
}

export function errorKey(error) {
  if (error?.translationKey) return error.translationKey;
  if (error instanceof SyntaxError) return "Invalid JSON. Check your input.";
  if (
    error instanceof URIError ||
    error?.name === "InvalidCharacterError" ||
    error?.name === "TypeError"
  )
    return "Invalid input. Check the format and try again.";
  const key = String(error?.message || "");
  // Only known interface messages are shown; never translate or expose user data.
  if (Object.hasOwn(de, key)) return key;
  return "Operation failed. Please check your input.";
}
export function apiFailure(response, data) {
  const byCode = {
    VALIDATION_ERROR: "Check the form fields and try again.",
    RATE_LIMITED: "Too many submissions. Please try again in 15 minutes.",
    PAYLOAD_TOO_LARGE: "Request exceeds 32 KB.",
    INVALID_JSON: "Invalid JSON. Check your input.",
  };
  const error = new Error(
    byCode[data?.code] || "Service temporarily unavailable. Please try again.",
  );
  error.translationKey = error.message;
  return error;
}
