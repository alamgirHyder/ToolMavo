<script setup>
import {
  ref,
  computed,
  watch,
  onBeforeUnmount,
  defineAsyncComponent,
} from "vue";
import { cats, tools, iconPaths, toolIconNames } from "./catalog";
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
    (t) =>
      (!category.value || t.cat === category.value) &&
      `${t.name} ${t.desc} ${cat(t.cat).name}`
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
watch(tool, (t) => {
  document.title = t
    ? `${t.name} — ToolMavo`
    : "ToolMavo — Every Tool. One Place.";
});
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
    if (!r.ok) throw Error(data.message || "Message could not be saved.");
    contactStatus.value =
      "Your message has been saved. Reference: " +
      data.id +
      ". Email delivery is not enabled.";
    contact.value = { name: "", email: "", message: "" };
  } catch (e) {
    contactError.value = e.message;
  } finally {
    sending.value = false;
  }
}
</script>
<template>
  <header>
    <div class="container nav">
      <a href="#home" class="brand" aria-label="ToolMavo home"
        ><span class="brand-mark">✦</span><span>tool<em>mavo</em>.</span></a
      >
      <nav
        class="navlinks"
        :class="{ open: menu }"
        aria-label="Main navigation"
      >
        <a href="#home">Home</a><a href="#all-tools">All Tools</a
        ><a href="#category/image">Image Tools</a
        ><a href="#category/pdf">PDF Tools</a
        ><a href="#category/calculator">Calculators</a
        ><a href="#all-tools" class="navcta">Explore Tools →</a>
      </nav>
      <button
        class="menu"
        :aria-expanded="menu"
        aria-label="Toggle navigation"
        @click="menu = !menu"
      >
        ☰
      </button>
    </div>
  </header>
  <main id="main">
    <template v-if="page === 'home'">
      <div class="hero">
        <div class="container">
          <span class="eyebrow"><b></b> YOUR EVERYDAY TOOLKIT</span>
          <h1>
            Every tool you need.<br /><span class="accent"
              >One simple place.</span
            >
          </h1>
          <p>
            Get things done faster with simple, beautifully designed tools for
            images, PDFs, calculators, text, and more. No clutter. Just results.
          </p>
          <form class="searchwrap" @submit.prevent="search">
            <span class="searchicon" aria-hidden="true">⌕</span
            ><input
              type="search"
              v-model="query"
              placeholder="Search for a tool..."
              aria-label="Search tools"
            /><button>Search →</button>
          </form>
          <div class="pills">
            <span>Popular:</span
            ><a class="filter" href="#tool/image-compressor">Compress Image</a
            ><a class="filter" href="#tool/merge-pdf">Merge PDF</a
            ><a class="filter" href="#tool/word-counter">Word Counter</a
            ><a class="filter" href="#tool/profit-margin-calculator"
              >Profit Margin</a
            >
          </div>
          <div class="stats">
            <div class="stat">
              <strong>{{ tools.length }}</strong
              >Useful tools
            </div>
            <div class="stat"><strong>6</strong>Categories</div>
            <div class="stat"><strong>Free</strong>Essential utilities</div>
          </div>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="sec-head">
            <div>
              <span class="kicker">Explore by category</span>
              <h2>Tools for every task</h2>
              <p>Find exactly what you need, without the extra steps.</p>
            </div>
            <a href="#all-tools" class="link">View all tools →</a>
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
                ><strong>{{ c.name }}</strong
                ><small>{{ c.desc }}</small></span
              ><span class="cat-arrow">›</span></a
            >
          </div>
        </div>
      </section>
      <section class="section" style="padding-top: 12px">
        <div class="container">
          <div class="sec-head">
            <div>
              <span class="kicker">Handpicked essentials</span>
              <h2>Popular tools</h2>
              <p>Start with the basics. Finish things faster.</p>
            </div>
            <a href="#all-tools" class="link">Browse all →</a>
          </div>
          <div class="tool-grid">
            <a
              v-for="t in popular"
              :key="t.id"
              class="tool"
              :href="'#tool/' + t.slug"
              ><span
                class="square"
                :style="{ background: cat(t.cat).bg, color: cat(t.cat).fg }"
                v-html="icon(toolIconNames[t.id])"
              ></span
              ><strong>{{ t.name }}</strong>
              <p>{{ t.desc }}</p>
              <span class="tool-status ready">Open tool →</span></a
            >
          </div>
        </div>
      </section>
      <section class="section feature">
        <div class="container">
          <div class="sec-head">
            <div>
              <span class="kicker">Why ToolMavo</span>
              <h2>Made to make work easier</h2>
              <p>No complicated dashboards. Just the tools you need.</p>
            </div>
          </div>
          <div class="featurebar">
            <div class="featurebox">
              <div class="sym">⚡</div>
              <strong>Quick and lightweight</strong>
              <p>
                Responsive tools built for focused tasks and useful results.
              </p>
            </div>
            <div class="featurebox">
              <div class="sym">◇</div>
              <strong>Your files stay with you</strong>
              <p>
                Image, PDF, text and QR processing happens locally in your
                browser.
              </p>
            </div>
            <div class="featurebox">
              <div class="sym">✓</div>
              <strong>Easy for everyone</strong>
              <p>
                No account required. Save invoices and send messages through our
                API.
              </p>
            </div>
          </div>
        </div>
      </section>
      <div class="container">
        <div class="cta">
          <div>
            <h2>Less busywork. More done.</h2>
            <p>Browse the full collection of useful everyday tools.</p>
          </div>
          <a href="#all-tools" class="filter">Explore all tools →</a>
        </div>
      </div>
    </template>
    <template v-else-if="['all-tools', 'category'].includes(page)"
      ><div class="catalog-top">
        <div class="container">
          <span class="kicker">Tool Library</span>
          <h1>{{ cat(category)?.name || "All the tools you need" }}</h1>
          <p>
            {{
              cat(category)?.desc ||
              "Explore 30 useful tools across six categories."
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
              aria-label="Filter tools"
              placeholder="Search tools..."
            /><button>Search</button>
          </form>
          <div class="filter-row">
            <a href="#all-tools" class="filter" :class="{ active: !category }"
              >All tools</a
            ><a
              v-for="c in cats"
              :key="c.id"
              :href="'#category/' + c.id"
              class="filter"
              :class="{ active: category === c.id }"
              >{{ c.name }}</a
            >
          </div>
          <p class="smallnote" aria-live="polite">
            {{ filtered.length }} tools found
          </p>
          <div class="tool-grid">
            <a
              v-for="t in filtered"
              :key="t.id"
              :href="'#tool/' + t.slug"
              class="tool"
              ><span
                class="square"
                :style="{ background: cat(t.cat).bg, color: cat(t.cat).fg }"
                v-html="icon(toolIconNames[t.id])"
              ></span
              ><strong>{{ t.name }}</strong>
              <p>{{ t.desc }}</p></a
            >
          </div>
          <div v-if="!filtered.length" class="empty">
            No tools found. Try another search.
          </div>
        </div>
      </section></template
    >
    <div v-else-if="page === 'tool' && tool" class="container">
      <article class="toolpage">
        <a class="back" href="#all-tools">← All tools</a>
        <p class="kicker">{{ cat(tool.cat).name }}</p>
        <h1>{{ tool.name }}</h1>
        <p class="lead">{{ tool.desc }}.</p>
        <ToolWorkspace :tool="tool" :key="tool.slug" />
        <h2>How to use {{ tool.name.toLowerCase() }}</h2>
        <p class="usecase">
          Add your text, values or files. Choose the settings for your task,
          then run the tool. Review the result and copy, print or download it.
        </p>
        <h2>Related tools</h2>
        <div
          class="tool-grid related"
          style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))"
        >
          <a
            v-for="t in tools
              .filter((t) => t.cat === tool.cat && t.id !== tool.id)
              .slice(0, 3)"
            :key="t.id"
            :href="'#tool/' + t.slug"
            class="tool"
            ><strong>{{ t.name }}</strong>
            <p>{{ t.desc }}</p></a
          >
        </div>
      </article>
    </div>
    <div v-else class="container">
      <article class="toolpage">
        <span class="kicker">ToolMavo</span>
        <template v-if="page === 'contact'"
          ><h1>Contact us</h1>
          <p class="lead">
            Have a question or a tool suggestion? Leave a message for the
            ToolMavo team.
          </p>
          <form class="workspace" @submit.prevent="sendContact">
            <div class="field">
              <label for="name">Name</label
              ><input
                id="name"
                v-model="contact.name"
                required
                maxlength="150"
              />
            </div>
            <div class="field">
              <label for="contactEmail">Email</label
              ><input
                id="contactEmail"
                type="email"
                v-model="contact.email"
                required
                maxlength="200"
              />
            </div>
            <div class="field">
              <label for="message">Message</label
              ><textarea
                id="message"
                v-model="contact.message"
                required
                minlength="10"
                maxlength="5000"
              ></textarea>
            </div>
            <button class="primary" :disabled="sending">
              {{ sending ? "Sending…" : "Send message" }}
            </button>
            <p role="status">{{ contactStatus }}</p>
            <p v-if="contactError" class="error" role="alert">
              {{ contactError }}
            </p>
            <p class="smallnote">
              Messages are stored in the website database. The operator must
              configure support handling before public launch.
            </p>
          </form></template
        >
        <template v-else-if="page === 'about'"
          ><h1>Everyday tools, thoughtfully made.</h1>
          <p class="lead">
            ToolMavo brings 30 image, document, calculator, text, developer and
            business utilities into one simple place.
          </p>
          <h2>Simple by design</h2>
          <p class="usecase">
            Use tools without creating an account. Images and PDFs are processed
            on your device. Invoice submissions and contact messages are saved
            by the backend.
          </p></template
        >
        <template v-else-if="page === 'privacy'"
          ><h1>Privacy information</h1>
          <p class="lead">
            Images, PDFs, QR content and text tool inputs stay in your browser.
            Invoice and contact form submissions are sent to the server and
            stored in MySQL.
          </p>
          <h2>Before public launch</h2>
          <p class="usecase">
            This implementation has no analytics or advertising integrations.
            The operator must publish its legal identity, contact address,
            retention schedule and applicable user rights process before
            collecting public submissions. This page describes implementation
            behavior and needs legal review.
          </p></template
        >
        <template v-else-if="page === 'terms'"
          ><h1>Terms of use</h1>
          <p class="lead">
            Tools are provided for general productivity. Review outputs before
            using them. Calculators provide estimates and are not financial or
            tax advice.
          </p>
          <p class="usecase">
            You are responsible for having permission to process uploaded
            material. Files are processed locally; large or encrypted files may
            not be supported. The website operator must add its legal identity,
            jurisdiction and reviewed terms before public launch.
          </p></template
        >
        <template v-else
          ><h1>Page not found</h1>
          <p class="lead">That tool or page could not be found.</p></template
        ><a href="#home" class="link">← Back to home</a>
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
            Free online utilities for creators, students, freelancers, and
            everyday work.
          </p>
        </div>
        <div class="footer-links">
          <div>
            <strong>Explore</strong><a href="#all-tools">All tools</a
            ><a href="#category/image">Image tools</a
            ><a href="#category/pdf">PDF tools</a
            ><a href="#category/calculator">Calculators</a>
          </div>
          <div>
            <strong>Resources</strong><a href="#category/text">Text tools</a
            ><a href="#category/developer">Developer tools</a
            ><a href="#category/business">Business tools</a>
          </div>
          <div>
            <strong>Company</strong><a href="#about">About</a
            ><a href="#privacy">Privacy information</a><a href="#terms">Terms</a
            ><a href="#contact">Contact</a>
          </div>
        </div>
      </div>
      <div class="copyright">
        <span>© {{ new Date().getFullYear() }} ToolMavo.</span
        ><span>Every tool. One simple place.</span>
      </div>
    </div>
  </footer>
</template>
