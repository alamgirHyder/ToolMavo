<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import QRCode from "qrcode";
import { useI18n, apiFailure, errorKey } from "./i18n";
const { t, locale, number, date } = useI18n();
import { calculate, transform, trackingUrl } from "./tools";
import { download, processImage, processPdf } from "./files";
const props = defineProps({ tool: Object });
const text = ref(""),
  second = ref(""),
  action = ref("upper"),
  result = ref(""),
  resultSpec = ref(null),
  error = ref(""),
  busy = ref(false),
  files = ref([]),
  outputs = ref([]),
  qr = ref("");
const opts = ref({
  width: 800,
  height: 600,
  quality: 80,
  pages: "1",
  watermark: "CONFIDENTIAL",
});
const errorParams = ref({});
const values = ref([100, 60, 25, 46]);
const invoice = ref({
  client: "",
  email: "",
  description: "Design services",
  quantity: 1,
  rate: 100,
  currency: "USD",
});
const saved = ref(null);
watch(
  invoice,
  () => {
    saved.value = null;
  },
  { deep: true },
);
const utm = ref({
  url: "https://example.com",
  source: "newsletter",
  medium: "email",
  campaign: "launch",
});
const labels = computed(
  () =>
    ({
      "profit-margin-calculator": ["Selling price", "Product cost"],
      "markup-calculator": ["Cost", "Markup (%)"],
      "vat-calculator": ["Amount excluding VAT", "VAT (%)"],
      "discount-calculator": ["Original price", "Discount (%)"],
      "break-even-calculator": [
        "Fixed costs",
        "Selling price per unit",
        "Variable cost per unit",
      ],
      "freelance-rate-calculator": [
        "Annual income target",
        "Annual expenses",
        "Billable hours per week",
        "Working weeks per year",
      ],
    })[props.tool.slug] || [],
);
const isFile = computed(() => ["image", "pdf"].includes(props.tool.cat));
const isText = computed(() => ["text", "developer"].includes(props.tool.cat));
function clearOutputs() {
  outputs.value.forEach((o) => URL.revokeObjectURL(o.url));
  outputs.value = [];
}
onBeforeUnmount(clearOutputs);
watch(
  () => props.tool.slug,
  () => {
    text.value = "";
    second.value = "";
    result.value = "";
    resultSpec.value = null;
    error.value = "";
    files.value = [];
    qr.value = "";
    saved.value = null;
    clearOutputs();
    values.value =
      props.tool.slug === "freelance-rate-calculator"
        ? [60000, 5000, 25, 46]
        : props.tool.slug === "break-even-calculator"
          ? [1000, 40, 15, 46]
          : props.tool.slug === "vat-calculator"
            ? [100, 20, 0, 0]
            : [100, 60, 25, 46];
  },
  { immediate: true },
);
const total = computed(
  () => Number(invoice.value.quantity) * Number(invoice.value.rate),
);
function choose(e) {
  error.value = "";
  const selected = [...e.target.files];
  if (
    selected.length > 30 ||
    selected.some((f) => f.size > 25 * 1024 * 1024) ||
    selected.reduce((sum, f) => sum + f.size, 0) > 100 * 1024 * 1024
  ) {
    error.value = "Choose up to 30 files, 25 MB per file and 100 MB total.";
    files.value = [];
    e.target.value = "";
    return;
  }
  files.value = selected;
  clearOutputs();
}
async function run(mode) {
  busy.value = true;
  error.value = "";
  result.value = "";
  resultSpec.value = null;
  notice.value = "";
  clearOutputs();
  try {
    const slug = props.tool.slug;
    if (isFile.value) {
      if (!files.value.length) throw Error("Choose a file first.");
      if (props.tool.cat === "image") {
        const blob = await processImage(slug, files.value[0], opts.value);
        outputs.value = [
          {
            blob,
            name: slug + (blob.type === "image/webp" ? ".webp" : ".jpg"),
            url: URL.createObjectURL(blob),
          },
        ];
        resultSpec.value = {
          kind: "image",
          original: files.value[0].size / 1024,
          size: blob.size / 1024,
        };
      } else
        outputs.value = (await processPdf(slug, files.value, opts.value)).map(
          (o) => ({ ...o, url: URL.createObjectURL(o.blob) }),
        );
    } else if (props.tool.cat === "calculator") {
      calculate(slug, ...values.value.map(Number));
      resultSpec.value = {
        kind: "calculator",
        slug,
        values: values.value.map(Number),
      };
    } else if (isText.value) {
      const transformed = transform(
        slug,
        text.value,
        mode || action.value,
        second.value,
      );
      if (["word-counter", "character-counter"].includes(slug))
        resultSpec.value = { kind: "text", slug, text: text.value };
      else if (
        slug === "text-difference-checker" &&
        transformed === "Texts are identical."
      )
        resultSpec.value = { kind: "identical" };
      else result.value = transformed;
    } else if (slug === "utm-link-builder")
      result.value = trackingUrl(
        utm.value.url,
        utm.value.source,
        utm.value.medium,
        utm.value.campaign,
      );
    else if (slug === "qr-code-generator") {
      if (!text.value.trim()) throw Error("Enter text or a URL.");
      if (text.value.length > 2000)
        throw Error("Use fewer than 2000 characters.");
      qr.value = await QRCode.toDataURL(text.value, { width: 320, margin: 2 });
    }
  } catch (e) {
    error.value = errorKey(e);
    errorParams.value = e.params || {};
  } finally {
    busy.value = false;
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(displayResult.value);
    notice.value = "Copied to clipboard.";
  } catch {
    error.value = "Clipboard unavailable. Select and copy the result manually.";
  }
}
const notice = ref("");
async function saveInvoice() {
  busy.value = true;
  error.value = "";
  try {
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...invoice.value,
        quantity: Number(invoice.value.quantity),
        rate: Number(invoice.value.rate),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw apiFailure(response, data);
    saved.value = data;
  } catch (e) {
    error.value =
      e.translationKey || "Service temporarily unavailable. Please try again.";
    errorParams.value = e.params || {};
  } finally {
    busy.value = false;
  }
}
const displayResult = computed(() => {
  const spec = resultSpec.value;
  if (!spec) return result.value;
  const presentation = {
    t,
    n: (value, decimals = 2) =>
      number(value, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
  };
  if (spec.kind === "calculator") {
    const calculated = calculate(spec.slug, ...spec.values, presentation);
    return calculated.value + "\n" + calculated.note;
  }
  if (spec.kind === "text")
    return transform(spec.slug, spec.text, "encode", "", presentation);
  if (spec.kind === "identical") return t("Texts are identical.");
  if (spec.kind === "image")
    return (
      t("Original: {original} KB → Result: {result} KB", {
        original: presentation.n(spec.original, 1),
        result: presentation.n(spec.size, 1),
      }) +
      (spec.size >= spec.original
        ? " · " + t("Output is not smaller; try reducing quality.")
        : "")
    );
  return result.value;
});
</script>
<template>
  <section class="workspace" :aria-label="t(tool.name)">
    <template v-if="isFile">
      <div class="field">
        <label for="files">{{
          t(
            tool.slug === "merge-pdf"
              ? "Select PDFs in the order to combine"
              : tool.slug === "images-to-pdf"
                ? "Select images in page order"
                : "Choose your file",
          )
        }}</label
        ><input
          id="files"
          type="file"
          :key="tool.slug"
          :accept="
            tool.cat === 'image' || tool.slug === 'images-to-pdf'
              ? 'image/png,image/jpeg,image/webp'
              : 'application/pdf'
          "
          :multiple="['merge-pdf', 'images-to-pdf'].includes(tool.slug)"
          @change="choose"
        />
      </div>
      <p class="smallnote">
        {{
          t(
            "Processed in your browser. Up to 30 files, 25 MB each, 100 MB total. Encrypted PDFs are unsupported.",
          )
        }}
      </p>
      <ol v-if="files.length">
        <li dir="auto" v-for="file in files" :key="file.name">
          {{ file.name }}
        </li>
      </ol>
      <div
        v-if="['image-resizer', 'image-cropper'].includes(tool.slug)"
        class="fieldgrid"
      >
        <div class="field">
          <label for="width"> {{ t("Width (px)") }} </label
          ><input
            id="width"
            v-model="opts.width"
            type="number"
            min="1"
            max="8192"
          />
        </div>
        <div class="field">
          <label for="height"> {{ t("Height (px)") }} </label
          ><input
            id="height"
            v-model="opts.height"
            type="number"
            min="1"
            max="8192"
          />
        </div>
      </div>
      <p v-if="tool.slug === 'image-cropper'" class="smallnote">
        {{ t("Crops from the center to your chosen dimensions.") }}
      </p>
      <div class="field" v-if="tool.cat === 'image'">
        <label for="quality"> {{ t("Quality:") }} {{ opts.quality }}%</label
        ><input
          id="quality"
          type="range"
          min="10"
          max="100"
          v-model="opts.quality"
        />
      </div>
      <div
        class="field"
        v-if="
          ['split-pdf', 'reorder-pdf-pages', 'pdf-to-jpg'].includes(tool.slug)
        "
      >
        <label for="pages">
          {{ t("Pages") }}
          {{
            tool.slug === "reorder-pdf-pages" ? t("in desired order") : ""
          }}</label
        ><input id="pages" v-model="opts.pages" placeholder="1,3-5,2" /><small
          class="smallnote"
        >
          {{
            t(
              "Page numbers start at 1. Split extracts selected pages into one PDF.",
            )
          }}
        </small>
      </div>
      <div class="field" v-if="tool.slug === 'pdf-watermark'">
        <label for="watermark">
          {{ t("Watermark text (Latin characters)") }} </label
        ><input id="watermark" v-model="opts.watermark" maxlength="80" />
      </div>
    </template>
    <template v-else-if="tool.cat === 'calculator'"
      ><div class="fieldgrid">
        <div class="field" v-for="(label, i) in labels" :key="label">
          <label :for="'value' + i">{{ t(label) }}</label
          ><input
            :id="'value' + i"
            type="number"
            min="0"
            step="any"
            v-model="values[i]"
          />
        </div>
      </div>
      <p class="smallnote">
        {{
          t(
            "Estimates only. Monetary results use the same currency as your inputs. VAT adds tax to the net amount.",
          )
        }}
      </p></template
    >
    <template v-else-if="isText || tool.slug === 'qr-code-generator'">
      <div class="field" v-if="tool.slug !== 'uuid-generator'">
        <label for="input">{{
          t(tool.slug === "qr-code-generator" ? "Text or URL" : "Input text")
        }}</label
        ><textarea
          id="input"
          v-model="text"
          dir="auto"
          :placeholder="t('Type or paste here…')"
          maxlength="1000000"
        ></textarea>
      </div>
      <div class="field" v-if="tool.slug === 'text-difference-checker'">
        <label for="second"> {{ t("Text to compare") }} </label
        ><textarea
          id="second"
          v-model="second"
          dir="auto"
          maxlength="1000000"
        ></textarea
        ><small class="smallnote">
          {{ t("Compares corresponding lines; − original, + changed.") }}
        </small>
      </div>
      <div class="field" v-if="tool.slug === 'case-converter'">
        <label for="case"> {{ t("Case") }} </label
        ><select id="case" v-model="action">
          <option value="upper">{{ t("UPPERCASE") }}</option>
          <option value="lower">{{ t("lowercase") }}</option>
          <option value="title">{{ t("Title Case") }}</option>
        </select>
      </div>
    </template>
    <template v-else-if="tool.slug === 'utm-link-builder'"
      ><div class="field" v-for="(v, k) in utm" :key="k">
        <label :for="k">{{ t(k === "url" ? "Website URL" : k) }}</label
        ><input
          :id="k"
          v-model="utm[k]"
          :type="k === 'url' ? 'url' : 'text'"
        /></div
    ></template>
    <template v-else-if="tool.slug === 'invoice-generator'">
      <form @submit.prevent="saveInvoice">
        <div class="fieldgrid">
          <div class="field">
            <label for="client"> {{ t("Client name") }} </label
            ><input
              id="client"
              v-model="invoice.client"
              dir="auto"
              required
              maxlength="150"
            />
          </div>
          <div class="field">
            <label for="email"> {{ t("Client email") }} </label
            ><input
              id="email"
              type="email"
              v-model="invoice.email"
              required
              maxlength="200"
            />
          </div>
        </div>
        <div class="field">
          <label for="description"> {{ t("Description") }} </label
          ><input
            id="description"
            v-model="invoice.description"
            dir="auto"
            required
            maxlength="500"
          />
        </div>
        <div class="fieldgrid">
          <div class="field">
            <label for="qty"> {{ t("Quantity") }} </label
            ><input
              id="qty"
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              v-model="invoice.quantity"
              required
            />
          </div>
          <div class="field">
            <label for="rate"> {{ t("Rate") }} </label
            ><input
              id="rate"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              v-model="invoice.rate"
              required
            />
          </div>
        </div>
        <div class="field">
          <label for="currency"> {{ t("Currency") }} </label
          ><select id="currency" v-model="invoice.currency">
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>PKR</option>
          </select>
        </div>
        <div class="actions">
          <button class="primary" :disabled="busy">
            {{ t(busy ? "Saving…" : "Save invoice") }}</button
          ><button type="button" class="filter" @click="windowPrint">
            {{ t("Print / Save PDF") }}
          </button>
        </div>
      </form>
      <div class="invoice">
        <h2>{{ t("ToolMavo Invoice") }}</h2>
        <p v-if="saved">
          {{ t("Invoice #") }} <bdi>{{ saved.id }}</bdi> ·
          {{ date(saved.createdAt) }}
        </p>
        <p>
          {{ t("Bill to:") }} {{ invoice.client || t("Client name") }}<br />{{
            invoice.email
          }}
        </p>
        <table>
          <thead>
            <tr>
              <th>{{ t("Description") }}</th>
              <th>{{ t("Quantity") }}</th>
              <th>{{ t("Rate") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ invoice.description }}</td>
              <td>{{ number(invoice.quantity) }}</td>
              <td>
                {{ invoice.currency }}
                {{
                  number(invoice.rate, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }}
              </td>
            </tr>
          </tbody>
        </table>
        <h3>
          {{ t("Total:") }} {{ invoice.currency }}
          {{
            saved
              ? number(saved.total, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : Number.isFinite(total)
                ? number(total, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"
          }}
        </h3>
      </div>
      <p v-if="saved" role="status">
        {{
          t(
            "Invoice saved to the database. Save a PDF for your records. Editing requires saving a new invoice.",
          )
        }}
      </p>
    </template>
    <div class="actions" v-if="tool.slug !== 'invoice-generator'">
      <template
        v-if="
          ['base64-encoder-decoder', 'url-encoder-decoder'].includes(tool.slug)
        "
        ><button class="primary" :disabled="busy" @click="run('encode')">
          {{ t("Encode") }}</button
        ><button class="filter" :disabled="busy" @click="run('decode')">
          {{ t("Decode") }}
        </button></template
      ><button v-else class="primary" :disabled="busy" @click="run()">
        {{
          t(
            busy
              ? "Processing…"
              : isFile
                ? "Process file"
                : tool.cat === "calculator"
                  ? "Calculate"
                  : tool.slug === "uuid-generator"
                    ? "Generate UUID"
                    : "Run tool",
          )
        }}
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ t(error, errorParams) }}</p>
    <div v-if="displayResult" class="result" aria-live="polite">
      <pre class="output" dir="auto">{{ displayResult }}</pre>
      <div class="actions">
        <button class="filter" @click="copy">{{ t("Copy result") }}</button
        ><button
          class="filter"
          @click="download(displayResult, tool.slug + '.txt', 'text/plain')"
        >
          {{ t("Download text") }}
        </button>
      </div>
    </div>
    <p role="status" class="smallnote">{{ notice ? t(notice) : "" }}</p>
    <div v-for="o in outputs" :key="o.name" class="result">
      <img
        v-if="o.blob.type.startsWith('image/')"
        :src="o.url"
        class="preview"
        :alt="t('Processed result')"
      /><button class="primary" @click="download(o.blob, o.name)">
        {{ t("Download") }} {{ o.name }}
      </button>
    </div>
    <div v-if="qr" class="result">
      <img :src="qr" class="preview" :alt="t('Generated QR code')" /><a
        :href="qr"
        download="toolmavo-qr.png"
        class="filter"
      >
        {{ t("Download QR code") }}
      </a>
    </div>
  </section>
</template>
<script>
export default {
  methods: {
    windowPrint() {
      window.print();
    },
  },
};
</script>
