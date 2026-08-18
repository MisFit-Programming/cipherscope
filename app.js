const content = document.querySelector("#tool-content");
const navItems = [...document.querySelectorAll("[data-tool]")];

const WORDS = ["amber","anchor","apple","atlas","basil","beacon","birch","breeze","brook","cedar","cinder","cloud","cobalt","comet","coral","delta","ember","fern","field","fjord","flint","forest","frost","grove","harbor","hazel","island","ivory","juniper","lagoon","lark","maple","meadow","mint","moon","moss","north","ocean","olive","orbit","pearl","pine","quartz","rain","reed","river","sage","shore","solar","spruce","stone","summit","tide","trail","vale","violet","wave","willow","wind","winter"];
const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA"];

function randomIndex(length) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function cleanHost(value) {
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0].replace(/\.$/, "");
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host) || host.includes("..")) throw new Error("Enter a valid public hostname, such as example.com.");
  return host;
}

function toolHeader(eyebrow, title, description, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function copyButton(id) {
  return `<button class="copy-button" data-copy="${id}">Copy</button>`;
}

function wireCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
    const source = document.querySelector(`#${button.dataset.copy}`);
    await navigator.clipboard.writeText(source?.textContent ?? "");
    button.textContent = "Copied ✓";
    setTimeout(() => { button.textContent = "Copy"; }, 1400);
  }));
}

function showError(message) {
  const target = document.querySelector("#result");
  if (target) target.innerHTML = `<div class="result-card error-state"><span aria-hidden="true">!</span><div><h2>We couldn’t complete that check</h2><p>${escapeHtml(message)}</p></div></div>`;
}

function rows(title, values) {
  return `<section class="result-section"><h3>${escapeHtml(title)}</h3><div class="result-rows">${values.length ? values.map((row) => `<div class="result-row">${row.label ? `<span>${escapeHtml(row.label)}</span>` : ""}<code>${escapeHtml(row.value)}</code>${row.tone ? `<b class="tone ${row.tone}">${row.tone}</b>` : ""}</div>`).join("") : '<p class="empty-row">No public records found.</p>'}</div></section>`;
}

function resultCard(title, summary, sections, facts = []) {
  const factMarkup = facts.length ? `<dl class="facts">${facts.map((fact) => `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`).join("")}</dl>` : "";
  return `<div class="result-card"><div class="result-head"><div><span class="status-dot"></span>Check complete</div></div><h2>${escapeHtml(title)}</h2><p class="result-summary">${escapeHtml(summary)}</p>${factMarkup}${sections.join("")}</div>`;
}

function makePassword(length, settings) {
  let alphabet = "";
  if (settings.uppercase) alphabet += "ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (settings.lowercase) alphabet += "abcdefghijkmnopqrstuvwxyz";
  if (settings.numbers) alphabet += "23456789";
  if (settings.symbols) alphabet += "!@#$%^&*_-+=";
  return Array.from({ length }, () => alphabet[randomIndex(alphabet.length)]).join("");
}

function renderPassword() {
  content.innerHTML = `${toolHeader("Password lab", "Generate a stronger password", "Create high-entropy credentials without sending anything across the network.", '<button class="ghost-button" id="regenerate">↻ New password</button>')}
    <div class="generator-card"><div class="output-label"><span>Generated password</span><span class="strength" id="strength"></span></div><div class="password-output"><code id="password-output"></code>${copyButton("password-output")}</div><div class="meter"><span id="meter"></span></div>
    <div class="control-block"><div class="control-heading"><label for="length">Length</label><output id="length-output">20 characters</output></div><input id="length" type="range" min="8" max="64" value="20"><div class="range-labels"><span>8</span><span>64</span></div></div>
    <div class="option-grid">${["uppercase","lowercase","numbers","symbols"].map((name) => `<label class="check-option"><input type="checkbox" data-set="${name}" checked><span>${name[0].toUpperCase() + name.slice(1)}</span></label>`).join("")}</div></div>
    <div class="trust-grid"><article><span>01</span><div><h3>Cryptographically random</h3><p>Uses your browser’s secure random-number generator.</p></div></article><article><span>02</span><div><h3>Never transmitted</h3><p>Generation and copying happen only on this device.</p></div></article><article><span>03</span><div><h3>Open and inspectable</h3><p>The complete site is served directly from GitHub Pages.</p></div></article></div>`;
  const settings = { uppercase: true, lowercase: true, numbers: true, symbols: true };
  const lengthInput = document.querySelector("#length");
  const generate = () => {
    const length = Number(lengthInput.value);
    const size = (settings.uppercase ? 24 : 0) + (settings.lowercase ? 24 : 0) + (settings.numbers ? 8 : 0) + (settings.symbols ? 12 : 0);
    const entropy = Math.round(length * Math.log2(size));
    document.querySelector("#password-output").textContent = makePassword(length, settings);
    document.querySelector("#strength").textContent = `${entropy >= 100 ? "Excellent" : entropy >= 70 ? "Strong" : "Good"} · ${entropy} bits`;
    document.querySelector("#meter").style.width = `${Math.min(100, entropy / 1.3)}%`;
  };
  lengthInput.addEventListener("input", () => { document.querySelector("#length-output").textContent = `${lengthInput.value} characters`; generate(); });
  document.querySelectorAll("[data-set]").forEach((input) => input.addEventListener("change", () => {
    settings[input.dataset.set] = input.checked;
    if (!Object.values(settings).some(Boolean)) { input.checked = true; settings[input.dataset.set] = true; }
    generate();
  }));
  document.querySelector("#regenerate").addEventListener("click", generate);
  wireCopyButtons(); generate();
}

function renderPassphrase() {
  content.innerHTML = `${toolHeader("Memorable secrets", "Build a secure passphrase", "Combine unrelated words into a credential that is easier to type and remember.", '<button class="ghost-button" id="regenerate">↻ New passphrase</button>')}
    <div class="generator-card"><div class="output-label"><span>Generated passphrase</span><span class="strength">Locally generated</span></div><div class="password-output"><code id="phrase-output"></code>${copyButton("phrase-output")}</div>
    <div class="form-grid three"><label>Words<select id="word-count">${[3,4,5,6,7,8].map((value) => `<option ${value === 5 ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Separator<select id="separator"><option value="-">Hyphen</option><option value=".">Period</option><option value="_">Underscore</option><option value=" ">Space</option></select></label><div class="toggle-stack"><label><input id="capitalize" type="checkbox" checked> Capitalize words</label><label><input id="digits" type="checkbox" checked> Add two digits</label></div></div><button class="primary full" id="build-phrase">Generate with these settings</button></div>
    <div class="notice"><strong>Keep each passphrase unique.</strong> A password manager remains the safest place to store credentials.</div>`;
  const generate = () => {
    const count = Number(document.querySelector("#word-count").value);
    const separator = document.querySelector("#separator").value;
    const caps = document.querySelector("#capitalize").checked;
    const selected = Array.from({ length: count }, () => WORDS[randomIndex(WORDS.length)]).map((word) => caps ? word[0].toUpperCase() + word.slice(1) : word);
    document.querySelector("#phrase-output").textContent = selected.join(separator) + (document.querySelector("#digits").checked ? String(10 + randomIndex(90)) : "");
  };
  document.querySelector("#regenerate").addEventListener("click", generate); document.querySelector("#build-phrase").addEventListener("click", generate); wireCopyButtons(); generate();
}

const DNS_RESOLVERS = [
  {
    name: "Google Public DNS",
    url: (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&edns_client_subnet=0.0.0.0%2F0`,
    options: {},
  },
  {
    name: "Cloudflare DNS",
    url: (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
    options: { headers: { accept: "application/dns-json" } },
  },
];

async function queryResolver(resolver, name, type) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(resolver.url(name, type), { ...resolver.options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data?.Status !== "number") throw new Error("Invalid DNS response");
    return { ...data, resolver: resolver.name };
  } finally {
    clearTimeout(timeout);
  }
}

async function dnsQuery(name, type) {
  for (const resolver of DNS_RESOLVERS) {
    try {
      return await queryResolver(resolver, name, type);
    } catch {
      if (resolver === DNS_RESOLVERS.at(-1)) {
        throw new Error("Public DNS is blocked or unavailable on this network. Try again on another connection or allow dns.google and cloudflare-dns.com.");
      }
    }
  }
}

function renderDns() {
  content.innerHTML = `${toolHeader("DNS explorer", "Resolve public DNS records", "Query common record types through browser-compatible public DNS-over-HTTPS resolvers.")}
    <form class="lookup-card" id="dns-form"><label for="dns-host">Domain or hostname</label><div class="lookup-row"><input id="dns-host" placeholder="example.com" spellcheck="false"><select id="dns-type" aria-label="Record type"><option>ALL</option>${DNS_TYPES.map((type) => `<option>${type}</option>`).join("")}</select><button class="primary">Resolve records</button></div><p>Only the hostname and requested record types are sent to the public resolver.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>+</span></div><h2>Ready when you are</h2><p>Public DNS results and TTL values will appear here.</p></div></div>`;
  document.querySelector("#dns-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = event.submitter; button.disabled = true; button.textContent = "Checking…";
    try {
      const host = cleanHost(document.querySelector("#dns-host").value); const choice = document.querySelector("#dns-type").value; const types = choice === "ALL" ? DNS_TYPES : [choice];
      const answers = await Promise.all(types.map(async (type) => ({ type, data: await dnsQuery(host, type) })));
      const total = answers.reduce((sum, item) => sum + (item.data.Answer?.length ?? 0), 0);
      const resolvers = [...new Set(answers.map((item) => item.data.resolver))].join(", ");
      document.querySelector("#result").innerHTML = resultCard(host, `${total} public record${total === 1 ? "" : "s"} found.`, answers.map((item) => rows(item.type, (item.data.Answer ?? []).map((answer) => ({ label: `${answer.name.replace(/\.$/, "")} · TTL ${answer.TTL}s`, value: answer.data.replace(/^"|"$/g, "") })))), [{ label: "Resolver", value: resolvers }, { label: "Record types", value: types.join(", ") }]);
    } catch (error) { showError(error.message); } finally { button.disabled = false; button.textContent = "Resolve records"; }
  });
}

function renderDomain() {
  content.innerHTML = `${toolHeader("Domain utility", "Normalize and inspect a domain", "Clean a pasted address, identify its registrable-looking domain, and open the authoritative public RDAP lookup.")}
    <form class="lookup-card" id="domain-form"><label for="domain-input">URL or hostname</label><div class="lookup-row"><input id="domain-input" placeholder="https://www.example.com/path" spellcheck="false"><button class="primary">Analyze domain</button></div><p>The value stays in this browser unless you choose to open the external RDAP record.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>◇</span></div><h2>Paste a domain or URL</h2><p>CipherScope will normalize it locally and prepare useful lookup links.</p></div></div>`;
  document.querySelector("#domain-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try { const host = cleanHost(document.querySelector("#domain-input").value); const parts = host.split("."); const apex = parts.length > 1 ? parts.slice(-2).join(".") : host; const rdap = `https://rdap.org/domain/${encodeURIComponent(apex)}`;
      document.querySelector("#result").innerHTML = resultCard(host, "The address was normalized locally. Multi-part public suffixes may require manual confirmation.", [rows("Domain details", [{ label: "Hostname", value: host }, { label: "Registrable-looking domain", value: apex }, { label: "Labels", value: String(parts.length) }]), `<section class="result-section"><h3>Public lookup</h3><a class="external-action" href="${rdap}" target="_blank" rel="noreferrer">Open ${escapeHtml(apex)} in RDAP ↗</a></section>`], [{ label: "Protocol removed", value: "Yes" }, { label: "Processed", value: "Entirely in browser" }]);
    } catch (error) { showError(error.message); }
  });
}

function ipv4ToNumber(ip) {
  const parts = ip.split(".").map(Number); if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) throw new Error("Enter a valid IPv4 address with an optional CIDR prefix, such as 192.0.2.25/24.");
  return parts.reduce((value, part) => ((value << 8) | part) >>> 0, 0) >>> 0;
}
function numberToIpv4(value) { return [24,16,8,0].map((shift) => (value >>> shift) & 255).join("."); }

function renderIp() {
  content.innerHTML = `${toolHeader("Offline network math", "Calculate an IPv4 subnet", "Turn an IPv4 address and CIDR prefix into its network, range, broadcast address, and usable host count.")}
    <form class="lookup-card" id="ip-form"><label for="ip-input">IPv4 address and prefix</label><div class="lookup-row"><input id="ip-input" placeholder="192.0.2.25/24" spellcheck="false"><button class="primary">Calculate subnet</button></div><p>No address is transmitted. IPv6 subnet calculations are not included in this edition.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>⌖</span></div><h2>Enter an IPv4 network</h2><p>The subnet calculation runs entirely on this device.</p></div></div>`;
  document.querySelector("#ip-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try { const [ip, prefixText = "32"] = document.querySelector("#ip-input").value.trim().split("/"); const prefix = Number(prefixText); if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("The CIDR prefix must be a whole number from 0 through 32."); const value = ipv4ToNumber(ip); const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0; const network = (value & mask) >>> 0; const broadcast = (network | (~mask >>> 0)) >>> 0; const total = 2 ** (32 - prefix); const usable = prefix >= 31 ? total : Math.max(0, total - 2);
      document.querySelector("#result").innerHTML = resultCard(`${numberToIpv4(value)}/${prefix}`, "Subnet values calculated locally using unsigned 32-bit address math.", [rows("Address range", [{ label: "Network", value: numberToIpv4(network) }, { label: "First address", value: numberToIpv4(prefix < 31 ? network + 1 : network) }, { label: "Last address", value: numberToIpv4(prefix < 31 ? broadcast - 1 : broadcast) }, { label: "Broadcast", value: numberToIpv4(broadcast) }])], [{ label: "Subnet mask", value: numberToIpv4(mask) }, { label: "Total addresses", value: total.toLocaleString() }, { label: "Usable hosts", value: usable.toLocaleString() }]);
    } catch (error) { showError(error.message); }
  });
}

function renderTls() {
  content.innerHTML = `${toolHeader("Certificate planning", "Check TLS certificate expiry", "Calculate certificate age, remaining validity, and a practical renewal window from its published dates.")}
    <form class="lookup-card" id="tls-form"><div class="form-grid two"><label>Valid from<input id="valid-from" type="date" max="9999-12-31"></label><label>Valid until<input id="valid-until" type="date" max="9999-12-31"></label></div><button class="primary full">Calculate validity</button><p>Find these dates in your browser’s certificate viewer. They never leave this page.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>◈</span></div><h2>Enter certificate dates</h2><p>CipherScope will flag certificates that are expired or approaching renewal.</p></div></div>`;
  document.querySelector("#tls-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try { const start = new Date(`${document.querySelector("#valid-from").value}T00:00:00Z`); const end = new Date(`${document.querySelector("#valid-until").value}T00:00:00Z`); if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error("Choose a valid start date and an expiry date after it."); const now = new Date(); const days = Math.ceil((end - now) / 86400000); const total = Math.ceil((end - start) / 86400000); const state = days < 0 ? "Expired" : days <= 14 ? "Renew immediately" : days <= 30 ? "Renew soon" : "Valid";
      document.querySelector("#result").innerHTML = resultCard(state, days < 0 ? `The certificate expired ${Math.abs(days)} days ago.` : `${days} days remain before expiry.`, [rows("Validity", [{ label: "Valid from", value: start.toLocaleDateString() }, { label: "Valid until", value: end.toLocaleDateString() }, { label: "Validity period", value: `${total} days` }, { label: "Suggested renewal", value: new Date(end.getTime() - 30 * 86400000).toLocaleDateString() }])], [{ label: "Status", value: state }, { label: "Days remaining", value: String(days) }]);
    } catch (error) { showError(error.message); }
  });
}

function renderHttp() {
  content.innerHTML = `${toolHeader("Offline response audit", "Analyze HTTP security headers", "Paste response headers from a browser or command-line request and review common browser protections locally.")}
    <form class="lookup-card" id="http-form"><label for="headers-input">Response headers</label><textarea id="headers-input" rows="11" placeholder="content-security-policy: default-src 'self'&#10;strict-transport-security: max-age=31536000&#10;x-content-type-options: nosniff"></textarea><button class="primary full">Analyze pasted headers</button><p>Tip: use your browser’s Network panel or run curl -I against a site you control.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>≡</span></div><h2>Paste response headers</h2><p>Nothing you paste is sent anywhere.</p></div></div>`;
  document.querySelector("#http-form").addEventListener("submit", (event) => {
    event.preventDefault(); const raw = document.querySelector("#headers-input").value.trim(); if (!raw) return showError("Paste one or more HTTP response headers first."); const parsed = {};
    raw.split(/\r?\n/).forEach((line) => { const index = line.indexOf(":"); if (index > 0) parsed[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim(); });
    const checks = [["strict-transport-security","HSTS"],["content-security-policy","Content Security Policy"],["x-content-type-options","MIME sniffing protection"],["referrer-policy","Referrer policy"],["permissions-policy","Permissions policy"],["cross-origin-opener-policy","Cross-origin opener policy"]]; const present = checks.filter(([key]) => parsed[key]).length;
    document.querySelector("#result").innerHTML = resultCard(`${Math.round(present / checks.length * 100)}% coverage`, `${present} of ${checks.length} recommended browser security headers were detected.`, [rows("Security headers", checks.map(([key,label]) => ({ label, value: parsed[key] || "Not present", tone: parsed[key] ? "present" : "missing" }))), rows("Other pasted headers", Object.entries(parsed).filter(([key]) => !checks.some(([required]) => required === key)).map(([label,value]) => ({ label, value })))], [{ label: "Headers parsed", value: String(Object.keys(parsed).length) }, { label: "Protections found", value: `${present}/${checks.length}` }]);
  });
}

function renderEmail() {
  content.innerHTML = `${toolHeader("Public mail DNS", "Check email security", "Review MX routing plus SPF and DMARC policy directly through public DNS-over-HTTPS.")}
    <form class="lookup-card" id="email-form"><label for="email-host">Email domain</label><div class="lookup-row"><input id="email-host" placeholder="example.com" spellcheck="false"><button class="primary">Check email DNS</button></div><p>DKIM is not guessed because providers use custom selectors; verify it with the selector from your mail provider.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>@</span></div><h2>Enter an email domain</h2><p>MX, SPF, and DMARC results will appear here.</p></div></div>`;
  document.querySelector("#email-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = event.submitter; button.disabled = true; button.textContent = "Checking…";
    try { const host = cleanHost(document.querySelector("#email-host").value); const [mx, txt, dmarc] = await Promise.all([dnsQuery(host,"MX"), dnsQuery(host,"TXT"), dnsQuery(`_dmarc.${host}`,"TXT")]); const clean = (answer) => (answer?.data ?? "").replace(/^"|"$/g, ""); const spf = (txt.Answer ?? []).map(clean).find((value) => value.toLowerCase().startsWith("v=spf1")); const dmarcValue = (dmarc.Answer ?? []).map(clean).find((value) => value.toLowerCase().startsWith("v=dmarc1")); const score = [mx.Answer?.length, spf, dmarcValue].filter(Boolean).length;
      document.querySelector("#result").innerHTML = resultCard(host, `${score} of 3 core public mail signals were detected.`, [rows("MX routing", (mx.Answer ?? []).map((answer) => ({ label: `TTL ${answer.TTL}s`, value: answer.data }))), rows("Policy records", [{ label: "SPF", value: spf || "Not present", tone: spf ? "present" : "missing" }, { label: "DMARC", value: dmarcValue || "Not present", tone: dmarcValue ? "present" : "missing" }])], [{ label: "Mail exchangers", value: mx.Answer?.length ? String(mx.Answer.length) : "None" }, { label: "SPF", value: spf ? "Published" : "Not found" }, { label: "DMARC", value: dmarcValue ? (dmarcValue.match(/\bp=([^;]+)/i)?.[1]?.toUpperCase() ?? "Published") : "Not found" }]);
    } catch (error) { showError(error.message); } finally { button.disabled = false; button.textContent = "Check email DNS"; }
  });
}

const renderers = { password: renderPassword, passphrase: renderPassphrase, dns: renderDns, domain: renderDomain, ip: renderIp, tls: renderTls, http: renderHttp, email: renderEmail };

function activate(tool) {
  navItems.forEach((item) => { const active = item.dataset.tool === tool; item.classList.toggle("active", active); if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current"); });
  renderers[tool](); history.replaceState(null, "", `#${tool}`); document.title = `CipherScope — ${document.querySelector(`[data-tool="${tool}"]`).textContent.trim()}`;
}

navItems.forEach((item) => item.addEventListener("click", () => activate(item.dataset.tool)));
const initial = location.hash.slice(1); activate(renderers[initial] ? initial : "password");
