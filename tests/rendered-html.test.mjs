import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the CipherScope workbench instead of the starter", async () => {
  const [page, component, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/CipherScopeApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /CipherScopeApp/);
  assert.match(component, /See the internet/);
  assert.match(component, /Password studio/i);
  assert.match(component, /No login required/i);
  assert.match(component, /World propagation/i);
  assert.match(layout, /CipherScope/);
  assert.doesNotMatch(page + component + layout + packageJson, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("defines every public tool route", async () => {
  for (const path of ["/passwords", "/connection", "/dns", "/domain", "/email", "/dashboard", "/signin"]) {
    await access(new URL(`../app${path}/page.tsx`, import.meta.url));
  }
});

test("keeps password generation on the client", async () => {
  const source = await readFile(new URL("../app/components/CipherScopeApp.tsx", import.meta.url), "utf8");
  const apiSource = await readFile(new URL("../app/api/checks/[type]/route.ts", import.meta.url), "utf8");
  assert.match(source, /crypto\.getRandomValues/);
  assert.match(source, /indexedDB\.open/);
  assert.doesNotMatch(apiSource, /passphrase|customWords|wordlist|crypto\.getRandomValues/i);
});

test("blocks unsafe outbound destinations in server checks", async () => {
  const source = await readFile(new URL("../app/api/checks/[type]/route.ts", import.meta.url), "utf8");
  assert.match(source, /Private, reserved, and metadata destinations are blocked/);
  assert.match(source, /privateIp/);
  assert.match(source, /redirect:\s*"manual"/);
});

test("provides regional DNS evidence without mislabeling physical probes", async () => {
  const source = await readFile(new URL("../app/api/checks/[type]/route.ts", import.meta.url), "utf8");
  assert.match(source, /EDNS Client Subnet/);
  assert.match(source, /regions:Region\[\]/);
  assert.match(source, /not physical probes/);
});

test("ships richer public DNS and device-local workflows", async () => {
  const [component, api] = await Promise.all([
    readFile(new URL("../app/components/CipherScopeApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/checks/[type]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(component, /refreshSeconds/);
  assert.match(component, /Share/);
  assert.match(component, /Recent on this device/);
  assert.match(component, /removeWatch/);
  assert.match(api, /contains.*exact.*regex/);
});

test("expands password controls and ships a connection-inspection endpoint", async () => {
  const [component, connection] = await Promise.all([
    readFile(new URL("../app/components/CipherScopeApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/connection/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(component, /tokenFormat/);
  assert.match(component, /recoveryGroups/);
  assert.match(component, /customSymbols/);
  assert.match(component, /Saved recipes/);
  assert.match(component, /My Connection/);
  assert.match(connection, /cf-connecting-ip/);
  assert.match(connection, /text\/plain/);
});
