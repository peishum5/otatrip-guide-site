/**
 * Tell Bing (and other IndexNow search engines) that pages changed.
 * Bing's index feeds ChatGPT search and Microsoft Copilot, so this helps
 * AI assistants pick up new prices and pages quickly.
 *
 * Run AFTER a production deploy:  npm run indexnow
 * It reads the live sitemap and submits every URL in it (no secrets needed;
 * the key below is public by design and is served at /<key>.txt).
 */
const HOST = 'otatrip.guide';
const KEY = '4051ba8819a2b055f1ce0addceaf8fcd';

const sitemap = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
urlList.push(`https://${HOST}/llms.txt`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});

console.log(`IndexNow: submitted ${urlList.length} URLs -> HTTP ${res.status}`);
if (!res.ok && res.status !== 202) process.exit(1);
