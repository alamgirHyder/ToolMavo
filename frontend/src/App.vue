<script setup>
import {
  ref,
  computed,
  watch,
  onBeforeUnmount,
  defineAsyncComponent,
} from "vue";
import { cats, tools, iconPaths, toolIconNames } from "./catalog";
import { useI18n, apiFailure, errorKey } from "./i18n";
const { t, locale, languages, setLanguage, number } = useI18n();
const ToolWorkspace = defineAsyncComponent(() => import("./ToolWorkspace.vue"));
const hash = ref(location.hash.slice(1) || "home"),
  menu = ref(false),
  query = ref(""),
  category = ref("");
function route() {
  hash.value = location.hash.slice(1) || "home";
  menu.value = false;
  category.value = hash.value.startsWith("category/")
    ? hash.value.split("/")[1]
    : "";
  query.value =
    new URLSearchParams(hash.value.split("?")[1] || "").get("q") || "";
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
onBeforeUnmount(() => window.removeEventListener("hashchange", route));
route();
const page = computed(() => hash.value.split("/")[0].split("?")[0]);
const tool = computed(() =>
  tools.find((t) => t.slug === hash.value.split("/")[1]),
);
const cat = (id) => cats.find((c) => c.id === id);
const filtered = computed(() =>
  tools.filter(
    (item) =>
      (!category.value || item.cat === category.value) &&
      `${item.name} ${item.desc} ${cat(item.cat).name} ${t(item.name)} ${t(item.desc)} ${t(cat(item.cat).name)}`
        .toLowerCase()
        .includes(query.value.toLowerCase()),
  ),
);
const icon = (name) =>
  `<svg class="vector-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.image}</svg>`;
const popular = [0, 1, 6, 12, 13, 18, 19, 27].map((i) => tools[i]);
function search() {
  location.hash = "all-tools?q=" + encodeURIComponent(query.value.trim());
}
watch(
  [tool, locale],
  ([currentTool]) => {
    document.title = currentTool
      ? `${t(currentTool.name)} — ToolMavo`
      : `ToolMavo — ${t("Every tool. One simple place.")}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t(
          "Free online utilities for creators, students, freelancers, and everyday work.",
        ),
      );
  },
  { immediate: true },
);
const contact = ref({ name: "", email: "", message: "" }),
  contactStatus = ref(""),
  contactError = ref(""),
  sending = ref(false);
async function sendContact() {
  sending.value = true;
  contactError.value = "";
  contactStatus.value = "";
  try {
    const r = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact.value),
    });
    const data = await r.json();
    if (!r.ok) throw apiFailure(r, data);
    contactStatus.value = data.id;
    contact.value = { name: "", email: "", message: "" };
  } catch (e) {
    contactError.value =
      e.translationKey || "Service temporarily unavailable. Please try again.";
  } finally {
    sending.value = false;
  }
}
</script>
<template>
  <header>
    <div class="container nav">
      <a href="#home" class="brand" :aria-label="t('ToolMavo home')"
        ><span class="brand-mark">✦</span><span>tool<em>mavo</em>.</span></a
      >
      <nav
        class="navlinks"
        :class="{ open: menu }"
        :aria-label="t('Main navigation')"
      >
        <a href="#home"> {{ t("Home") }} </a
        ><a href="#all-tools"> {{ t("All Tools") }} </a
        ><a href="#category/image"> {{ t("Image Tools") }} </a
        ><a href="#category/pdf"> {{ t("PDF Tools") }} </a
        ><a href="#category/calculator"> {{ t("Calculators") }} </a
        ><a href="#all-tools" class="navcta"> {{ t("Explore Tools →") }} </a>
      </nav>
      <button
        class="menu"
        :aria-expanded="menu"
        :aria-label="t('Toggle navigation')"
        @click="menu = !menu"
      >
        ☰
      </button>
      <label class="language-control"
        ><span class="sr-only">{{ t("Language") }}</span>
        <select
          data-testid="language-select"
          :value="locale"
          @change="setLanguage($event.target.value)"
          :aria-label="t('Language')"
        >
          <option
            v-for="language in languages"
            :key="language.code"
            :value="language.code"
            :lang="language.code"
          >
            {{ language.name }}
          </option>
        </select>
      </label>
    </div>
  </header>
  <main id="main">
    <template v-if="page === 'home'">
      <div class="hero">
        <div class="container">
          <span class="eyebrow"><b></b> {{ t("YOUR EVERYDAY TOOLKIT") }} </span>
          <h1>
            {{ t("Every tool you need.") }} <br /><span class="accent">
              {{ t("One simple place.") }}
            </span>
          </h1>
          <p>
            {{
              t(
                "Get things done faster with simple, beautifully designed tools for images, PDFs, calculators, text, and more. No clutter. Just results.",
              )
            }}
          </p>
          <form class="searchwrap" @submit.prevent="search">
            <span class="searchicon" aria-hidden="true">⌕</span
            ><input
              type="search"
              v-model="query"
              :placeholder="t('Search for a tool...')"
              :aria-label="t('Search tools')"
            /><button>{{ t("Search →") }}</button>
          </form>
          <div class="pills">
            <span> {{ t("Popular:") }} </span
            ><a class="filter" href="#tool/image-compressor">
              {{ t("Compress Image") }} </a
            ><a class="filter" href="#tool/merge-pdf"> {{ t("Merge PDF") }} </a
            ><a class="filter" href="#tool/word-counter">
              {{ t("Word Counter") }} </a
            ><a class="filter" href="#tool/profit-margin-calculator">
              {{ t("Profit Margin") }}
            </a>
          </div>
          <div class="stats">
            <div class="stat">
              <strong>{{ number(tools.length) }}</strong>
              {{ t("Useful tools") }}
            </div>
            <div class="stat"><strong>6</strong> {{ t("Categories") }}</div>
            <div class="stat">
              <strong> {{ t("Free") }} </strong> {{ t("Essential utilities") }}
            </div>
          </div>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="sec-head">
            <div>
              <span class="kicker"> {{ t("Explore by category") }} </span>
              <h2>{{ t("Tools for every task") }}</h2>
              <p>
                {{ t("Find exactly what you need, without the extra steps.") }}
              </p>
            </div>
            <a href="#all-tools" class="link"> {{ t("View all tools →") }} </a>
          </div>
          <div class="category-grid">
            <a
              v-for="c in cats"
              :key="c.id"
              :href="'#category/' + c.id"
              class="category"
              ><span
                class="square"
                :style="{ background: c.bg, color: c.fg }"
                v-html="icon(c.id)"
              ></span
              ><span class="cat-text"
                ><strong>{{ t(c.name) }}</strong
                ><small>{{ t(c.desc) }}</small></span
              ><span class="cat-arrow">›</span></a
            >
          </div>
        </div>
      </section>
      <section class="section" style="padding-top: 12px">
        <div class="container">
          <div class="sec-head">
            <div>
              <span class="kicker"> {{ t("Handpicked essentials") }} </span>
              <h2>{{ t("Popular tools") }}</h2>
              <p>{{ t("Start with the basics. Finish things faster.") }}</p>
            </div>
            <a href="#all-tools" class="link"> {{ t("Browse all →") }} </a>
          </div>
          <div class="tool-grid">
            <a
              v-for="card in popular"
              :key="card.id"
              class="tool"
              :href="'#tool/' + card.slug"
              ><span
                class="square"
                :style="{
                  background: cat(card.cat).bg,
                  color: cat(card.cat).fg,
                }"
                v-html="icon(toolIconNames[card.id])"
              ></span
              ><strong>{{ t(card.name) }}</strong>
              <p>{{ t(card.desc) }}</p>
              <span class="tool-status ready"> {{ t("Open tool →") }} </span></a
            >
          </div>
        </div>
      </section>
      <section class="section feature">
        <div class="container">
          <div class="sec-head">
            <div>
              <span class="kicker"> {{ t("Why ToolMavo") }} </span>
              <h2>{{ t("Made to make work easier") }}</h2>
              <p>
                {{ t("No complicated dashboards. Just the tools you need.") }}
              </p>
            </div>
          </div>
          <div class="featurebar">
            <div class="featurebox">
              <div class="sym">⚡</div>
              <strong> {{ t("Quick and lightweight") }} </strong>
              <p>
                {{
                  t(
                    "Responsive tools built for focused tasks and useful results.",
                  )
                }}
              </p>
            </div>
            <div class="featurebox">
              <div class="sym">◇</div>
              <strong> {{ t("Your files stay with you") }} </strong>
              <p>
                {{
                  t(
                    "Image, PDF, text and QR processing happens locally in your browser.",
                  )
                }}
              </p>
            </div>
            <div class="featurebox">
              <div class="sym">✓</div>
              <strong> {{ t("Easy for everyone") }} </strong>
              <p>
                {{
                  t(
                    "No account required. Save invoices and send messages through our API.",
                  )
                }}
              </p>
            </div>
          </div>
        </div>
      </section>
      <div class="container">
        <div class="cta">
          <div>
            <h2>{{ t("Less busywork. More done.") }}</h2>
            <p>
              {{ t("Browse the full collection of useful everyday tools.") }}
            </p>
          </div>
          <a href="#all-tools" class="filter">
            {{ t("Explore all tools →") }}
          </a>
        </div>
      </div>
    </template>
    <template v-else-if="['all-tools', 'category'].includes(page)"
      ><div class="catalog-top">
        <div class="container">
          <span class="kicker"> {{ t("Tool Library") }} </span>
          <h1>{{ t(cat(category)?.name || "All the tools you need") }}</h1>
          <p>
            {{
              t(
                cat(category)?.desc ||
                  "Explore 30 useful tools across six categories.",
              )
            }}
          </p>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <form class="searchwrap" style="margin: 0 0 27px" @submit.prevent>
            <span class="searchicon">⌕</span
            ><input
              v-model="query"
              :aria-label="t('Filter tools')"
              :placeholder="t('Search tools...')"
            /><button>{{ t("Search") }}</button>
          </form>
          <div class="filter-row">
            <a href="#all-tools" class="filter" :class="{ active: !category }">
              {{ t("All tools") }} </a
            ><a
              v-for="c in cats"
              :key="c.id"
              :href="'#category/' + c.id"
              class="filter"
              :class="{ active: category === c.id }"
              >{{ t(c.name) }}</a
            >
          </div>
          <p class="smallnote" aria-live="polite">
            {{ number(filtered.length) }} {{ t("tools found") }}
          </p>
          <div class="tool-grid">
            <a
              v-for="card in filtered"
              :key="card.id"
              :href="'#tool/' + card.slug"
              class="tool"
              ><span
                class="square"
                :style="{
                  background: cat(card.cat).bg,
                  color: cat(card.cat).fg,
                }"
                v-html="icon(toolIconNames[card.id])"
              ></span
              ><strong>{{ t(card.name) }}</strong>
              <p>{{ t(card.desc) }}</p></a
            >
          </div>
          <div v-if="!filtered.length" class="empty">
            {{ t("No tools found. Try another search.") }}
          </div>
        </div>
      </section></template
    >
    <div v-else-if="page === 'tool' && tool" class="container">
      <article class="toolpage">
        <a class="back" href="#all-tools"> {{ t("← All tools") }} </a>
        <p class="kicker">{{ t(cat(tool.cat).name) }}</p>
        <h1>{{ t(tool.name) }}</h1>
        <p class="lead">{{ t(tool.desc) }}.</p>
        <ToolWorkspace :tool="tool" :key="tool.slug" />
        <h2>{{ t("How to use {tool}", { tool: t(tool.name) }) }}</h2>
        <p class="usecase">
          {{
            t(
              "Add your text, values or files. Choose the settings for your task, then run the tool. Review the result and copy, print or download it.",
            )
          }}
        </p>
        <h2>{{ t("Related tools") }}</h2>
        <div
          class="tool-grid related"
          style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))"
        >
          <a
            v-for="card in tools
              .filter((card) => card.cat === tool.cat && card.id !== tool.id)
              .slice(0, 3)"
            :key="card.id"
            :href="'#tool/' + card.slug"
            class="tool"
            ><strong>{{ t(card.name) }}</strong>
            <p>{{ t(card.desc) }}</p></a
          >
        </div>
      </article>
    </div>
    <div v-else class="container">
      <article class="toolpage">
        <span class="kicker"> {{ t("ToolMavo") }} </span>
        <template v-if="page === 'contact'"
          ><h1>{{ t("Contact us") }}</h1>
          <p class="lead">
            {{
              t(
                "Have a question or a tool suggestion? Leave a message for the ToolMavo team.",
              )
            }}
          </p>
          <form class="workspace" @submit.prevent="sendContact">
            <div class="field">
              <label for="name"> {{ t("Name") }} </label
              ><input
                id="name"
                v-model="contact.name"
                required
                maxlength="150"
              />
            </div>
            <div class="field">
              <label for="contactEmail"> {{ t("Email") }} </label
              ><input
                id="contactEmail"
                type="email"
                v-model="contact.email"
                required
                maxlength="200"
              />
            </div>
            <div class="field">
              <label for="message"> {{ t("Message") }} </label
              ><textarea
                id="message"
                v-model="contact.message"
                required
                minlength="10"
                maxlength="5000"
              ></textarea>
            </div>
            <button class="primary" :disabled="sending">
              {{ t(sending ? "Sending…" : "Send message") }}
            </button>
            <p role="status">
              {{
                contactStatus
                  ? t(
                      "Your message has been saved. Reference: {id}. Email delivery is not enabled.",
                      { id: contactStatus },
                    )
                  : ""
              }}
            </p>
            <p v-if="contactError" class="error" role="alert">
              {{ t(contactError) }}
            </p>
            <p class="smallnote">
              {{
                t(
                  "Messages are stored in the website database. The operator must configure support handling before public launch.",
                )
              }}
            </p>
          </form></template
        >
        <template v-else-if="page === 'about'"
          ><h1>{{ t("Everyday tools, thoughtfully made.") }}</h1>
          <p class="lead">
            {{
              t(
                "ToolMavo brings 30 image, document, calculator, text, developer and business utilities into one simple place.",
              )
            }}
          </p>
          <h2>{{ t("Simple by design") }}</h2>
          <p class="usecase">
            {{
              t(
                "Use tools without creating an account. Images and PDFs are processed on your device. Invoice submissions and contact messages are saved by the backend.",
              )
            }}
          </p></template
        >
        <template v-else-if="page === 'privacy'"
          ><h1>{{ t("Privacy information") }}</h1>
          <p class="lead">
            {{
              t(
                "Images, PDFs, QR content and text tool inputs stay in your browser. Invoice and contact form submissions are sent to the server and stored in MySQL.",
              )
            }}
          </p>
          <h2>{{ t("Before public launch") }}</h2>
          <p class="usecase">
            {{
              t(
                "This implementation has no analytics or advertising integrations. The operator must publish its legal identity, contact address, retention schedule and applicable user rights process before collecting public submissions. This page describes implementation behavior and needs legal review.",
              )
            }}
          </p></template
        >
        <template v-else-if="page === 'terms'"
          ><h1>{{ t("Terms of use") }}</h1>
          <p class="lead">
            {{
              t(
                "Tools are provided for general productivity. Review outputs before using them. Calculators provide estimates and are not financial or tax advice.",
              )
            }}
          </p>
          <p class="usecase">
            {{
              t(
                "You are responsible for having permission to process uploaded material. Files are processed locally; large or encrypted files may not be supported. The website operator must add its legal identity, jurisdiction and reviewed terms before public launch.",
              )
            }}
          </p></template
        >
        <template v-else
          ><h1>{{ t("Page not found") }}</h1>
          <p class="lead">
            {{ t("That tool or page could not be found.") }}
          </p></template
        ><a href="#home" class="link"> {{ t("← Back to home") }} </a>
      </article>
    </div>
  </main>
  <footer>
    <div class="container">
      <div class="footer-main">
        <div>
          <a href="#home" class="brand"
            ><span class="brand-mark">✦</span><span>tool<em>mavo</em>.</span></a
          >
          <p>
            {{
              t(
                "Free online utilities for creators, students, freelancers, and everyday work.",
              )
            }}
          </p>
        </div>
        <div class="footer-links">
          <div>
            <strong> {{ t("Explore") }} </strong
            ><a href="#all-tools"> {{ t("All tools") }} </a
            ><a href="#category/image"> {{ t("Image tools") }} </a
            ><a href="#category/pdf"> {{ t("PDF tools") }} </a
            ><a href="#category/calculator"> {{ t("Calculators") }} </a>
          </div>
          <div>
            <strong> {{ t("Resources") }} </strong
            ><a href="#category/text"> {{ t("Text tools") }} </a
            ><a href="#category/developer"> {{ t("Developer tools") }} </a
            ><a href="#category/business"> {{ t("Business tools") }} </a>
          </div>
          <div>
            <strong> {{ t("Company") }} </strong
            ><a href="#about"> {{ t("About") }} </a
            ><a href="#privacy"> {{ t("Privacy information") }} </a
            ><a href="#terms"> {{ t("Terms") }} </a
            ><a href="#contact"> {{ t("Contact") }} </a>
          </div>
        </div>
      </div>
      <p class="smallnote language-note">
        {{
          t(
            "Language preference is saved on this device. Browser language is used on your first visit; no location lookup is performed.",
          )
        }}
      </p>
      <div class="copyright">
        <span>© {{ new Date().getFullYear() }} {{ t("ToolMavo.") }} </span
        ><span> {{ t("Every tool. One simple place.") }} </span>
      </div>
    </div>
  </footer>
</template>
