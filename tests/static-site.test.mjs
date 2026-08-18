import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships a complete GitHub Pages entrypoint", async () => {
  const [html, css, script] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    access(new URL("og.png", root)),
    access(new URL(".nojekyll", root)),
  ]);

  assert.match(html, /CipherScope — Private Security Workbench/);
  assert.match(html, /Pages edition/);
  assert.match(html, /\.\/styles\.css/);
  assert.match(html, /\.\/app\.js/);
  assert.doesNotMatch(html, /\/api\/|localhost|codex-preview/i);
  assert.match(css, /@media\(max-width:760px\)/);

  for (const tool of ["password", "passphrase", "supertool", "dns", "health", "domain", "ip", "connection", "tls", "http", "email", "mailheaders", "policy"]) {
    assert.match(html, new RegExp(`data-tool=["']${tool}["']`));
    assert.match(script, new RegExp(`render${tool[0].toUpperCase()}${tool.slice(1)}`));
  }

  assert.match(script, /crypto\.getRandomValues/);
  assert.match(script, /dns\.google\/resolve/);
  assert.match(script, /cloudflare-dns\.com\/dns-query/);
  assert.match(script, /Public DNS is blocked or unavailable/);
  assert.match(script, /mxtoolbox\.com\/SuperTool/);
  assert.match(script, /api\.ipify\.org/);
  assert.match(script, /ifconfig\.me\/all\.json/);
  assert.match(script, /function parseMailHeaders/);
  assert.doesNotMatch(script, /\/api\/inspect|fetch\(`https:\/\/ipwho\.is|crt\.sh/);
});
