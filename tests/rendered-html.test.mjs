import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the complete CipherScope workbench shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>CipherScope — Private Security Workbench<\/title>/i);
  assert.match(html, /Generate a stronger password/);
  assert.match(html, /Password generator/);
  assert.match(html, /DNS records/);
  assert.match(html, /TLS certificate/);
  assert.match(html, /Email security/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});
