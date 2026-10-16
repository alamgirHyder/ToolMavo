<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import QRCode from "qrcode";
import { calculate, transform, trackingUrl } from "./tools";
import { download, processImage, processPdf } from "./files";
const props = defineProps({ tool: Object });
const text = ref(""),
  second = ref(""),
  action = ref("upper"),
  result = ref(""),
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
        result.value = `Original: ${(files.value[0].size / 1024).toFixed(1)} KB → Result: ${(blob.size / 1024).toFixed(1)} KB${blob.size >= files.value[0].size ? " · Output is not smaller; try reducing quality." : ""}`;
      } else
        outputs.value = (await processPdf(slug, files.value, opts.value)).map(
          (o) => ({ ...o, url: URL.createObjectURL(o.blob) }),
        );
    } else if (props.tool.cat === "calculator") {
      const v = calculate(slug, ...values.value.map(Number));
      result.value = v.value + "\n" + v.note;
    } else if (isText.value)
      result.value = transform(
        slug,
        text.value,
        mode || action.value,
        second.value,
      );
    else if (slug === "utm-link-builder")
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
    error.value = e.message || "Operation failed. Please check your input.";
  } finally {
    busy.value = false;
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(result.value);
    result.value = result.value;
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
    if (!response.ok) throw Error(data.message || "Unable to save invoice.");
    saved.value = data;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="workspace" :aria-label="tool.name + ' workspace'">
    <template v-if="isFile">
      <div class="field">
        <label for="files">{{
          tool.slug === "merge-pdf"
            ? "Select PDFs in the order to combine"
            : tool.slug === "images-to-pdf"
              ? "Select images in page order"
              : "Choose your file"
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
        Processed in your browser. Up to 30 files, 25 MB each, 100 MB total.
        Encrypted PDFs are unsupported.
      </p>
      <ol v-if="files.length">
        <li v-for="file in files" :key="file.name">{{ file.name }}</li>
      </ol>
      <div
        v-if="['image-resizer', 'image-cropper'].includes(tool.slug)"
        class="fieldgrid"
      >
        <div class="field">
          <label for="width">Width (px)</label
          ><input
            id="width"
            v-model="opts.width"
            type="number"
            min="1"
            max="8192"
          />
        </div>
        <div class="field">
          <label for="height">Height (px)</label
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
        Crops from the center to your chosen dimensions.
      </p>
      <div class="field" v-if="tool.cat === 'image'">
        <label for="quality">Quality: {{ opts.quality }}%</label
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
        <label for="pages"
          >Pages
          {{
            tool.slug === "reorder-pdf-pages" ? "in desired order" : ""
          }}</label
        ><input id="pages" v-model="opts.pages" placeholder="1,3-5,2" /><small
          class="smallnote"
          >Page numbers start at 1. Split extracts selected pages into one
          PDF.</small
        >
      </div>
      <div class="field" v-if="tool.slug === 'pdf-watermark'">
        <label for="watermark">Watermark text (Latin characters)</label
        ><input id="watermark" v-model="opts.watermark" maxlength="80" />
      </div>
    </template>
    <template v-else-if="tool.cat === 'calculator'"
      ><div class="fieldgrid">
        <div class="field" v-for="(label, i) in labels" :key="label">
          <label :for="'value' + i">{{ label }}</label
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
        Estimates only. Monetary results use the same currency as your inputs.
        VAT adds tax to the net amount.
      </p></template
    >
    <template v-else-if="isText || tool.slug === 'qr-code-generator'">
      <div class="field" v-if="tool.slug !== 'uuid-generator'">
        <label for="input">{{
          tool.slug === "qr-code-generator" ? "Text or URL" : "Input text"
        }}</label
        ><textarea
          id="input"
          v-model="text"
          placeholder="Type or paste here…"
          maxlength="1000000"
        ></textarea>
      </div>
      <div class="field" v-if="tool.slug === 'text-difference-checker'">
        <label for="second">Text to compare</label
        ><textarea id="second" v-model="second" maxlength="1000000"></textarea
        ><small class="smallnote"
          >Compares corresponding lines; − original, + changed.</small
        >
      </div>
      <div class="field" v-if="tool.slug === 'case-converter'">
        <label for="case">Case</label
        ><select id="case" v-model="action">
          <option value="upper">UPPERCASE</option>
          <option value="lower">lowercase</option>
          <option value="title">Title Case</option>
        </select>
      </div>
    </template>
    <template v-else-if="tool.slug === 'utm-link-builder'"
      ><div class="field" v-for="(v, k) in utm" :key="k">
        <label :for="k">{{ k === "url" ? "Website URL" : k }}</label
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
            <label for="client">Client name</label
            ><input
              id="client"
              v-model="invoice.client"
              required
              maxlength="150"
            />
          </div>
          <div class="field">
            <label for="email">Client email</label
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
          <label for="description">Description</label
          ><input
            id="description"
            v-model="invoice.description"
            required
            maxlength="500"
          />
        </div>
        <div class="fieldgrid">
          <div class="field">
            <label for="qty">Quantity</label
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
            <label for="rate">Rate</label
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
          <label for="currency">Currency</label
          ><select id="currency" v-model="invoice.currency">
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>PKR</option>
          </select>
        </div>
        <div class="actions">
          <button class="primary" :disabled="busy">
            {{ busy ? "Saving…" : "Save invoice" }}</button
          ><button type="button" class="filter" @click="windowPrint">
            Print / Save PDF
          </button>
        </div>
      </form>
      <div class="invoice">
        <h2>ToolMavo Invoice</h2>
        <p v-if="saved">
          Invoice #{{ saved.id }} ·
          {{ new Date(saved.createdAt).toLocaleDateString() }}
        </p>
        <p>
          Bill to: {{ invoice.client || "Client name" }}<br />{{
            invoice.email
          }}
        </p>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ invoice.description }}</td>
              <td>{{ invoice.quantity }}</td>
              <td>
                {{ invoice.currency }} {{ Number(invoice.rate).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>
        <h3>
          Total: {{ invoice.currency }}
          {{ saved ? Number(saved.total).toFixed(2) : Number.isFinite(total) ? total.toFixed(2) : "—" }}
        </h3>
      </div>
      <p v-if="saved" role="status">
        Invoice saved to the database. Save a PDF for your records. Editing
        requires saving a new invoice.
      </p>
    </template>
    <div class="actions" v-if="tool.slug !== 'invoice-generator'">
      <template
        v-if="
          ['base64-encoder-decoder', 'url-encoder-decoder'].includes(tool.slug)
        "
        ><button class="primary" :disabled="busy" @click="run('encode')">
          Encode</button
        ><button class="filter" :disabled="busy" @click="run('decode')">
          Decode
        </button></template
      ><button v-else class="primary" :disabled="busy" @click="run()">
        {{
          busy
            ? "Processing…"
            : isFile
              ? "Process file"
              : tool.cat === "calculator"
                ? "Calculate"
                : tool.slug === "uuid-generator"
                  ? "Generate UUID"
                  : "Run tool"
        }}
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="result" class="result" aria-live="polite">
      <pre class="output">{{ result }}</pre>
      <div class="actions">
        <button class="filter" @click="copy">Copy result</button
        ><button
          class="filter"
          @click="download(result, tool.slug + '.txt', 'text/plain')"
        >
          Download text
        </button>
      </div>
    </div>
    <p role="status" class="smallnote">{{ notice }}</p>
    <div v-for="o in outputs" :key="o.name" class="result">
      <img
        v-if="o.blob.type.startsWith('image/')"
        :src="o.url"
        class="preview"
        alt="Processed result"
      /><button class="primary" @click="download(o.blob, o.name)">
        Download {{ o.name }}
      </button>
    </div>
    <div v-if="qr" class="result">
      <img :src="qr" class="preview" alt="Generated QR code" /><a
        :href="qr"
        download="toolmavo-qr.png"
        class="filter"
        >Download QR code</a
      >
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
