import { writeFile } from 'node:fs/promises';

// Netlify serves Vue; a separately hosted Spring Boot instance handles /api.
// Fail visibly rather than publish a site whose save actions cannot work.
if (!process.env.BACKEND_URL) {
  throw new Error('Set BACKEND_URL to your deployed Spring Boot HTTPS origin in Netlify settings.');
}
const backend = new URL(process.env.BACKEND_URL);
if (backend.protocol !== 'https:' || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) {
  throw new Error('BACKEND_URL must be an HTTPS origin without credentials, path, query, or fragment.');
}
await writeFile('dist/_redirects', `/api/* ${backend.origin}/api/:splat 200\n`);
console.log('Configured the Spring Boot API proxy.');
