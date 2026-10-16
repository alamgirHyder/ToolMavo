# ToolMavo 2.1.0 validation report

Validated on 16 October 2026 using Node.js 24, MySQL 8.4 and Chromium 154.

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Frontend utility and localization unit tests | 15 | 0 | 0 |
| HTTP API and security tests | 10 | 0 | 0 |
| Real MySQL integration test | 1 | 0 | 0 |
| Browser tests against the extracted production package | 20 | 0 | 0 |
| **Total** | **46** | **0** | **0** |

The browser runner reported no flaky tests. Three browser cases run axe WCAG 2 A/AA and WCAG 2.1 AA automated checks on six representative routes each, in English, German and Urdu (18 route/language scans). All scans found zero violations for the selected rules; this is automated coverage, not a complete accessibility certification.

## Verified behavior

- First-visit browser-language detection for German and Urdu; unsupported languages fall back to English.
- Explicit preferences override browser language and survive reload. Blocked local storage does not break detection or manual selection.
- German and Urdu headings on all 30 tool pages. Dictionaries cover 278 interface messages per language, all category/tool descriptions, and matching interpolation placeholders.
- German search, translated calculator/counter results, form statuses and API errors. Urdu layout and horizontal-overflow checks at 390, 768 and 1280 pixels.
- Changing language preserves entered text, selected files, generated encodings, saved invoice state and chosen currency. User HTML-like content remains escaped text.
- Image exports have the expected JPEG/WebP signatures; image resizing produces the requested dimensions. Images-to-PDF produces a readable PDF.
- PDF merge/extraction produces expected page counts; reorder changes the first page dimensions as requested. Watermarked PDFs remain readable. PDF-to-JPG produces the expected image dimensions and rendered page content.
- Contact and invoice submissions persist through the API in actual MySQL. Integration checks preserve German and Urdu Unicode, calculate invoice totals exactly, and initialize the schema repeatedly without losing records.
- API input validation, private-record access restrictions, request-size limits, response security headers and submission limits with stable error codes.

## Release checks

- Production Vue build passed using a clean frozen-lockfile frontend install.
- The upload ZIP was extracted into a separate directory. Root dependencies installed with `npm ci --omit=dev`; `npm start` honored the injected port and served the application and a working MySQL health endpoint.
- API and MySQL tests passed from the extracted package. Frontend unit tests passed after installing its test dependencies. Browser tests ran against the extracted package's production server.
- Backend and frontend `npm audit --omit=dev` results: **0 known vulnerabilities** in each. PDF.js was updated to 6.4.299 and its loading-task cleanup adapted to the updated API.
- Archive file hashes were verified. The final package retains this tested runtime fingerprint:

```text
eb00a89fa561d030c2809d9f38c2c074151f6149ddf84d6840bd335aba34216e
```

`DEPLOYMENT-MANIFEST.json` records the runtime fingerprint and hashes for included files. The adjacent `.zip.sha256` file verifies the complete final ZIP. Documentation/screenshots may be refreshed without changing the tested runtime fingerprint.

## Reproduce

```bash
npm ci
npm run build
npm test
npm run test:frontend
# Supply your local test database bindings securely:
npm run test:integration
# Start the application, then point the browser runner to its port:
cd frontend
TEST_BASE_URL=http://127.0.0.1:8080 npm run test:e2e
```

## Scope limits

The public Hostinger URL has not been deployed or tested; its database bindings, domain, TLS and Node.js settings still need configuration in hPanel. Browser automation used Chromium, not Safari or Firefox. Native file dialogs and built-in form validation use browser/OS language. Generated legal pages still need operator-specific review; translations are implemented but have not had independent professional linguistic review. No email-delivery or account-management integration is included.
