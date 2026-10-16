# ToolMavo 2.2.0 validation report

Validated on 16 October 2026 using Node.js 24, MySQL 8.4 and Chromium 154.

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Frontend utility and localization unit tests | 16 | 0 | 0 |
| HTTP API and security tests | 10 | 0 | 0 |
| Real MySQL integration test | 1 | 0 | 0 |
| Browser language, functional and accessibility tests | 31 | 0 | 0 |
| **Total** | **58** | **0** | **0** |

The browser runner reported no flaky tests. Twelve browser cases run automated axe WCAG 2 A/AA and WCAG 2.1 AA checks on six representative routes per language (72 route/language scans). All selected rules passed. This is automated coverage, not a complete accessibility certification.

## Verified behavior

- English is the default for fresh visitors regardless of browser language, including German, Urdu, Arabic and Chinese browser profiles.
- Explicit language choices survive reload. Blocked local storage retains the English default and still permits manual selection during the visit.
- Twelve built-in languages: English, German, Urdu, Arabic, Hindi, Bengali, Simplified Chinese, Spanish, French, Portuguese (Brazil), Russian and Japanese. All eleven non-English dictionaries cover 278 messages, every category/tool description and matching placeholders. All 30 German and Urdu tool pages are also exercised in the browser.
- All 12 language selections, remembered choices, translated tool search and locale-specific calculator output. Responsive overflow checks at 390, 768 and 1280 pixels in all languages. Arabic and Urdu use RTL. German/Urdu tests also exercise live form statuses, counter outputs and API errors.
- Changing language preserves entered text, selected files, generated encodings, saved invoice state and chosen currency. User HTML-like content remains escaped text.
- Image exports have the expected JPEG/WebP signatures; image resizing produces the requested dimensions. Images-to-PDF produces a readable PDF.
- PDF merge/extraction produces expected page counts; reorder changes the first page dimensions as requested. Watermarked PDFs remain readable. PDF-to-JPG produces the expected image dimensions and rendered page content.
- Contact and invoice submissions persist through the API in actual MySQL. Integration checks preserve German and Urdu Unicode, calculate invoice totals exactly, and initialize the schema repeatedly without losing records.
- API input validation, private-record access restrictions, request-size limits, response security headers and submission limits with stable error codes.

## Release checks

- Production Vue build passed. Dependencies were unchanged for this release; no external translation service or API key is used.
- The deployment ZIP includes the production Vue assets, server, lockfiles, all language packs, tests and documentation. File checksums and manifest verify included content.
- API, frontend unit and real MySQL tests passed. All 31 browser cases ran against the production Node server serving the built frontend; final archive startup is separately smoke-tested.
- Backend and frontend `npm audit --omit=dev` results: **0 known vulnerabilities** in each. PDF.js was updated to 6.4.299 and its loading-task cleanup adapted to the updated API.
- Archive file hashes were verified. `DEPLOYMENT-MANIFEST.json` records all 12 languages, the English default, a runtime fingerprint and SHA-256 hashes for included files. The adjacent `.zip.sha256` verifies the complete ZIP.

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
