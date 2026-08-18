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

const SUPER_COMMANDS = ["mx","a","aaaa","cname","txt","ns","soa","caa","ptr","spf","dkim","dmarc","bimi","mta-sts","tlsrpt","dns","whois","arin","asn","blacklist","smtp","tcp","http","https","ping","trace"];
const DNS_COMMAND_TYPES = { mx:"MX", a:"A", aaaa:"AAAA", cname:"CNAME", txt:"TXT", ns:"NS", soa:"SOA", caa:"CAA", ptr:"PTR" };

function externalLookupUrl(command, value) {
  return `https://mxtoolbox.com/SuperTool.aspx?action=${encodeURIComponent(`${command}:${value}`)}&run=toolpage`;
}

function externalLinks(links) {
  return `<div class="external-grid">${links.map((link) => `<a class="external-action" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer"><span>${escapeHtml(link.label)}</span><b>↗</b></a>`).join("")}</div>`;
}

function lookupFallback(value, command = "dns") {
  const target = encodeURIComponent(value);
  return `<div class="result-card fallback-state"><div class="result-head"><div><span class="status-dot amber"></span>Browser lookup restricted</div></div><h2>Continue with an external diagnostic</h2><p class="result-summary">This network is blocking direct public DNS requests from the page. CipherScope remains Pages-only, so it cannot proxy around that policy. These links open the lookup at the provider.</p>${externalLinks([
    { label: `MXToolbox ${command.toUpperCase()} lookup`, url: externalLookupUrl(command, value) },
    { label: "Google Public DNS", url: `https://dns.google/query?name=${target}&type=${encodeURIComponent(DNS_COMMAND_TYPES[command] || "A")}` },
    { label: "ICANN domain lookup", url: `https://lookup.icann.org/en/lookup?name=${target}` },
  ])}</div>`;
}

function showLookupFallback(value, command) {
  const target = document.querySelector("#result");
  if (target) target.innerHTML = lookupFallback(value, command);
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
    } catch (error) { const choice = document.querySelector("#dns-type").value; if (error.message.startsWith("Public DNS is blocked")) showLookupFallback(document.querySelector("#dns-host").value.trim(), choice === "ALL" ? "dns" : choice.toLowerCase()); else showError(error.message); } finally { button.disabled = false; button.textContent = "Resolve records"; }
  });
}

async function runDnsCommand(command, rawValue) {
  let name;
  let type;
  let filter = () => true;
  if (command === "ptr") {
    const ip = rawValue.trim();
    ipv4ToNumber(ip);
    name = `${ip.split(".").reverse().join(".")}.in-addr.arpa`;
    type = "PTR";
  } else {
    const [hostValue, selectorValue] = rawValue.split(":");
    const host = cleanHost(hostValue);
    name = host;
    type = DNS_COMMAND_TYPES[command];
    if (command === "spf") { type = "TXT"; filter = (answer) => answer.data.replaceAll('"', "").toLowerCase().startsWith("v=spf1"); }
    if (command === "dmarc") { name = `_dmarc.${host}`; type = "TXT"; filter = (answer) => answer.data.replaceAll('"', "").toLowerCase().startsWith("v=dmarc1"); }
    if (command === "mta-sts") { name = `_mta-sts.${host}`; type = "TXT"; }
    if (command === "tlsrpt") { name = `_smtp._tls.${host}`; type = "TXT"; }
    if (command === "bimi") { name = `default._bimi.${host}`; type = "TXT"; }
    if (command === "dkim") {
      const selector = selectorValue?.trim().toLowerCase();
      if (!selector || !/^[a-z0-9_-]+$/.test(selector)) throw new Error("For DKIM, enter the domain and selector as example.com:selector.");
      name = `${selector}._domainkey.${host}`; type = "TXT";
    }
  }
  const data = await dnsQuery(name, type);
  return { name, type, resolver: data.resolver, answers: (data.Answer ?? []).filter(filter) };
}

function renderSupertool() {
  content.innerHTML = `${toolHeader("Integrated diagnostics", "Run a SuperTool lookup", "Use command-style DNS, email, reputation, website, and network diagnostics from one place.")}
    <form class="lookup-card" id="super-form"><label for="super-value">Domain, hostname, or IP address</label><div class="lookup-row"><select id="super-command" aria-label="Lookup command">${SUPER_COMMANDS.map((command) => `<option>${command}</option>`).join("")}</select><input id="super-value" placeholder="example.com" spellcheck="false"><button class="primary">Run lookup</button></div><p>DKIM values use domain:selector. Server-side tests open at MXToolbox because static Pages cannot make SMTP, ICMP, TCP, or blacklist connections.</p><div class="quick-commands">${["mx","spf","dmarc","blacklist","smtp","https","ptr"].map((command) => `<button type="button" data-command="${command}">${command}:</button>`).join("")}</div></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>⌘</span></div><h2>Choose a diagnostic</h2><p>DNS-backed commands run in the page when permitted. Restricted network tests hand off with the target already filled in.</p></div></div>`;
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => { document.querySelector("#super-command").value = button.dataset.command; document.querySelector("#super-value").focus(); }));
  document.querySelector("#super-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = event.submitter; const command = document.querySelector("#super-command").value; const value = document.querySelector("#super-value").value.trim();
    if (!value) return showError("Enter a domain, hostname, or IP address first.");
    button.disabled = true; button.textContent = "Checking…";
    try {
      if (command === "dns") {
        const host = cleanHost(value); const types = ["A","AAAA","MX","NS","TXT","SOA"];
        const results = await Promise.all(types.map(async (recordType) => ({ recordType, data: await dnsQuery(host, recordType) })));
        const count = results.reduce((sum, item) => sum + (item.data.Answer?.length ?? 0), 0);
        document.querySelector("#result").innerHTML = resultCard(host, `${count} records found across ${types.length} DNS types.`, results.map((item) => rows(item.recordType, (item.data.Answer ?? []).map((answer) => ({ label: `TTL ${answer.TTL}s`, value: answer.data.replace(/^"|"$/g, "") })))), [{ label:"Command", value:"dns" }, { label:"Resolver", value:results[0].data.resolver }]);
      } else if (DNS_COMMAND_TYPES[command] || ["spf","dkim","dmarc","bimi","mta-sts","tlsrpt"].includes(command)) {
        const result = await runDnsCommand(command, value);
        document.querySelector("#result").innerHTML = resultCard(result.name, `${result.answers.length} matching ${command.toUpperCase()} record${result.answers.length === 1 ? "" : "s"} found.`, [rows(result.type, result.answers.map((answer) => ({ label:`TTL ${answer.TTL}s`, value:answer.data.replace(/^"|"$/g, "") }))), `<section class="result-section"><h3>Related diagnostics</h3>${externalLinks([{ label:"Open full MXToolbox test", url:externalLookupUrl(command, value) }])}</section>`], [{ label:"Command", value:command }, { label:"Resolver", value:result.resolver }]);
      } else {
        document.querySelector("#result").innerHTML = resultCard(`${command}:${value}`, "This diagnostic requires a remote server or licensed reputation data and cannot run inside static GitHub Pages.", [`<section class="result-section"><h3>Continue securely</h3>${externalLinks([{ label:`Run ${command.toUpperCase()} at MXToolbox`, url:externalLookupUrl(command, value) }, { label:"Open ICANN lookup", url:`https://lookup.icann.org/en/lookup?name=${encodeURIComponent(value)}` }])}</section>`], [{ label:"Mode", value:"External diagnostic" }, { label:"Target", value }]);
      }
    } catch (error) {
      if (error.message.startsWith("Public DNS is blocked")) showLookupFallback(value, command); else showError(error.message);
    } finally { button.disabled = false; button.textContent = "Run lookup"; }
  });
}

function healthRow(label, present, detail) { return { label, value:detail, tone:present ? "present" : "missing" }; }

function renderHealth() {
  content.innerHTML = `${toolHeader("Mail and DNS posture", "Check domain health", "Review core public records for mail delivery, policy enforcement, certificate issuance, and authoritative DNS.")}
    <form class="lookup-card" id="health-form"><label for="health-host">Domain name</label><div class="lookup-row"><input id="health-host" placeholder="example.com" spellcheck="false"><button class="primary">Check domain</button></div><p>This Pages edition evaluates public DNS signals. SMTP, reputation, and active web-server tests are linked separately.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>✓</span></div><h2>Run a domain health check</h2><p>MX, SPF, DMARC, MTA-STS, TLS reporting, CAA, and name-server signals will appear here.</p></div></div>`;
  document.querySelector("#health-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = event.submitter; const host = document.querySelector("#health-host").value.trim(); button.disabled = true; button.textContent = "Checking…";
    try {
      const domain = cleanHost(host); const queries = await Promise.all([
        dnsQuery(domain,"MX"), dnsQuery(domain,"TXT"), dnsQuery(`_dmarc.${domain}`,"TXT"), dnsQuery(`_mta-sts.${domain}`,"TXT"), dnsQuery(`_smtp._tls.${domain}`,"TXT"), dnsQuery(domain,"CAA"), dnsQuery(domain,"NS")
      ]);
      const [mx,txt,dmarc,mta,tlsrpt,caa,ns] = queries; const text = (data) => (data.Answer ?? []).map((answer) => answer.data.replaceAll('"', ""));
      const spfValue = text(txt).find((value) => value.toLowerCase().startsWith("v=spf1")); const dmarcValue = text(dmarc).find((value) => value.toLowerCase().startsWith("v=dmarc1"));
      const checks = [healthRow("MX routing", Boolean(mx.Answer?.length), mx.Answer?.length ? `${mx.Answer.length} exchanger(s)` : "No MX records"), healthRow("SPF", Boolean(spfValue), spfValue || "Not published"), healthRow("DMARC", Boolean(dmarcValue), dmarcValue || "Not published"), healthRow("MTA-STS", Boolean(mta.Answer?.length), text(mta)[0] || "Not published"), healthRow("TLS reporting", Boolean(tlsrpt.Answer?.length), text(tlsrpt)[0] || "Not published"), healthRow("CAA", Boolean(caa.Answer?.length), caa.Answer?.length ? `${caa.Answer.length} policy record(s)` : "No issuance restriction"), healthRow("Authoritative DNS", Boolean(ns.Answer?.length), ns.Answer?.length ? `${ns.Answer.length} name server(s)` : "No NS response")];
      const passed = checks.filter((check) => check.tone === "present").length;
      document.querySelector("#result").innerHTML = resultCard(domain, `${passed} of ${checks.length} public health signals were detected.`, [rows("Health signals", checks), `<section class="result-section"><h3>Active and reputation tests</h3>${externalLinks([{ label:"Full email health report", url:`https://mxtoolbox.com/emailhealth/${encodeURIComponent(domain)}/` }, { label:"Blacklist check", url:externalLookupUrl("blacklist", domain) }, { label:"SMTP diagnostics", url:externalLookupUrl("smtp", domain) }])}</section>`], [{ label:"Signals", value:`${passed}/${checks.length}` }, { label:"Resolver", value:queries[0].resolver }, { label:"Scope", value:"Public DNS" }]);
    } catch (error) { if (error.message.startsWith("Public DNS is blocked")) showLookupFallback(host, "dns"); else showError(error.message); } finally { button.disabled = false; button.textContent = "Check domain"; }
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
    } catch (error) { if (error.message.startsWith("Public DNS is blocked")) showLookupFallback(document.querySelector("#email-host").value.trim(), "mx"); else showError(error.message); } finally { button.disabled = false; button.textContent = "Check email DNS"; }
  });
}

function parseMailHeaders(raw) {
  const parsed = {};
  raw.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/).forEach((line) => {
    const index = line.indexOf(":"); if (index < 1) return;
    const name = line.slice(0, index).trim().toLowerCase(); const value = line.slice(index + 1).trim();
    (parsed[name] ||= []).push(value);
  });
  return parsed;
}

function authStatus(text, protocol) {
  const match = text.match(new RegExp(`\\b${protocol}=([a-z]+)`, "i"));
  return match?.[1]?.toUpperCase() || "NOT REPORTED";
}

function renderMailheaders() {
  content.innerHTML = `${toolHeader("Delivered message diagnostics", "Analyze email headers", "Inspect routing hops, authentication results, identities, and common warning signals without uploading a message.")}
    <form class="lookup-card" id="mail-header-form"><label for="mail-header-input">Raw email headers</label><textarea id="mail-header-input" rows="15" placeholder="Authentication-Results: mx.example; spf=pass; dkim=pass; dmarc=pass&#10;Received: from mail.example.com ...&#10;From: sender@example.com&#10;Return-Path: &lt;bounce@example.com&gt;"></textarea><button class="primary full">Analyze email headers</button><p>Paste headers only—not the message body. Everything is processed locally in this browser.</p></form><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>↳</span></div><h2>Paste delivered-message headers</h2><p>CipherScope will summarize authentication and the visible delivery path.</p></div></div>`;
  document.querySelector("#mail-header-form").addEventListener("submit", (event) => {
    event.preventDefault(); const raw = document.querySelector("#mail-header-input").value.trim(); if (!raw) return showError("Paste the raw headers from a delivered message first.");
    const parsed = parseMailHeaders(raw); const auth = [...(parsed["authentication-results"] ?? []), ...(parsed["received-spf"] ?? [])].join(" ");
    const statuses = ["spf","dkim","dmarc"].map((protocol) => { const status = authStatus(auth, protocol); return { label:protocol.toUpperCase(), value:status, tone:status === "PASS" ? "present" : "missing" }; });
    const received = parsed.received ?? []; const from = parsed.from?.[0] || "Not present"; const returnPath = parsed["return-path"]?.[0] || "Not present";
    const warnings = []; if (!parsed.date) warnings.push("Date header is missing."); if (!parsed["message-id"]) warnings.push("Message-ID is missing."); if (received.length === 0) warnings.push("No Received routing hops were found."); if (statuses.every((item) => item.value === "NOT REPORTED")) warnings.push("No SPF, DKIM, or DMARC result was found.");
    document.querySelector("#result").innerHTML = resultCard(parsed.subject?.[0] || "Email header report", `${received.length} visible routing hop${received.length === 1 ? "" : "s"}; ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`, [rows("Authentication", statuses), rows("Identity", [{ label:"From", value:from }, { label:"Return-Path", value:returnPath }, { label:"Message-ID", value:parsed["message-id"]?.[0] || "Not present" }, { label:"Date", value:parsed.date?.[0] || "Not present" }]), rows("Delivery path (newest first)", received.map((value,index) => ({ label:`Hop ${index + 1}`, value }))), rows("Warnings", warnings.map((value) => ({ value })))], [{ label:"SPF", value:statuses[0].value }, { label:"DKIM", value:statuses[1].value }, { label:"DMARC", value:statuses[2].value }, { label:"Headers", value:String(Object.keys(parsed).length) }]);
  });
}

function renderPolicy() {
  content.innerHTML = `${toolHeader("Email authentication", "Build SPF and DMARC records", "Create starter policy records locally, then review them with your mail provider before publishing.")}
    <div class="policy-grid"><form class="lookup-card" id="dmarc-form"><h2>DMARC record</h2><div class="form-grid two"><label>Policy<select id="dmarc-policy"><option>none</option><option>quarantine</option><option>reject</option></select></label><label>Percentage<input id="dmarc-pct" type="number" min="0" max="100" value="100"></label><label>Alignment<select id="dmarc-align"><option value="r">Relaxed</option><option value="s">Strict</option></select></label><label>Aggregate reports<input id="dmarc-rua" type="email" placeholder="dmarc@example.com"></label></div><button class="primary full">Generate DMARC</button></form>
    <form class="lookup-card" id="spf-form"><h2>SPF record</h2><div class="form-grid"><label>Allowed IPv4 ranges<input id="spf-ip4" placeholder="192.0.2.0/24, 198.51.100.10"></label><label>Provider includes<input id="spf-include" placeholder="_spf.google.com, spf.protection.outlook.com"></label><label>All other senders<select id="spf-all"><option value="-all">Fail (-all)</option><option value="~all">Softfail (~all)</option><option value="?all">Neutral (?all)</option></select></label></div><button class="primary full">Generate SPF</button></form></div><div id="result" class="empty-state-wrap"><div class="empty-state"><div class="scope-rings"><span>✎</span></div><h2>Configure a policy</h2><p>The generated TXT value can be copied into your DNS provider after review.</p></div></div>`;
  const showRecord = (name, value, guidance) => { document.querySelector("#result").innerHTML = resultCard(name, guidance, [`<section class="result-section"><h3>TXT value</h3><div class="password-output"><code id="policy-output">${escapeHtml(value)}</code>${copyButton("policy-output")}</div></section>`], [{ label:"Record type", value:"TXT" }, { label:"Generated", value:"Locally" }]); wireCopyButtons(); };
  document.querySelector("#dmarc-form").addEventListener("submit", (event) => { event.preventDefault(); const policy = document.querySelector("#dmarc-policy").value; const pct = Math.min(100, Math.max(0, Number(document.querySelector("#dmarc-pct").value) || 0)); const align = document.querySelector("#dmarc-align").value; const rua = document.querySelector("#dmarc-rua").value.trim(); const record = `v=DMARC1; p=${policy}; pct=${pct}; adkim=${align}; aspf=${align}${rua ? `; rua=mailto:${rua}` : ""}`; showRecord("_dmarc", record, "Start with monitoring when uncertain, review reports, then move toward enforcement."); });
  document.querySelector("#spf-form").addEventListener("submit", (event) => { event.preventDefault(); const ips = document.querySelector("#spf-ip4").value.split(",").map((value) => value.trim()).filter(Boolean).map((value) => `ip4:${value}`); const includes = document.querySelector("#spf-include").value.split(",").map((value) => value.trim()).filter(Boolean).map((value) => `include:${value}`); const record = ["v=spf1", ...ips, ...includes, document.querySelector("#spf-all").value].join(" "); showRecord("@ / root domain", record, "Publish only one SPF record and include every service authorized to send mail for the domain."); });
}

const IP_SERVICES = [
  { name:"ipify IPv4", url:"https://api.ipify.org?format=json", read:(data) => data.ip },
  { name:"ipify dual stack", url:"https://api64.ipify.org?format=json", read:(data) => data.ip },
  { name:"ifconfig.me", url:"https://ifconfig.me/all.json", read:(data) => data.ip_addr },
];

async function fetchPublicIp() {
  for (const service of IP_SERVICES) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5000);
    try { const response = await fetch(service.url, { signal:controller.signal }); if (!response.ok) throw new Error(); const data = await response.json(); const ip = service.read(data); if (ip) return { ip, service:service.name }; } catch {} finally { clearTimeout(timeout); }
  }
  return null;
}

function renderConnection() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection; const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable";
  content.innerHTML = `${toolHeader("Connection snapshot", "What is my IP?", "View the public address exposed to websites plus browser and connection details available on this device.", '<button class="ghost-button" id="refresh-ip">↻ Refresh</button>')}
    <div id="result">${resultCard("Checking public address…", "Local browser details are ready while CipherScope tries several public IP services.", [rows("Browser details", [{ label:"User agent", value:navigator.userAgent }, { label:"Language", value:navigator.languages?.join(", ") || navigator.language }, { label:"Platform", value:navigator.platform || "Unavailable" }, { label:"Timezone", value:zone }, { label:"Viewport", value:`${window.innerWidth} × ${window.innerHeight}` }, { label:"Online status", value:navigator.onLine ? "Online" : "Offline" }, { label:"Connection", value:connection ? `${connection.effectiveType || "unknown"}; ${connection.downlink || "?"} Mbps; ${connection.rtt || "?"} ms RTT` : "Not exposed by this browser" }])], [{ label:"Public IP", value:"Checking…" }, { label:"Privacy", value:"External service required" }])}</div>`;
  const load = async () => {
    const target = document.querySelector("#result"); target.querySelector("h2").textContent = "Checking public address…"; const result = await fetchPublicIp();
    if (result) target.innerHTML = resultCard(result.ip, "This is the public address a permitted external service sees for your browser connection.", [rows("Browser details", [{ label:"User agent", value:navigator.userAgent }, { label:"Languages", value:navigator.languages?.join(", ") || navigator.language }, { label:"Platform", value:navigator.platform || "Unavailable" }, { label:"Timezone", value:zone }, { label:"Viewport", value:`${window.innerWidth} × ${window.innerHeight}` }, { label:"Online status", value:navigator.onLine ? "Online" : "Offline" }, { label:"Connection", value:connection ? `${connection.effectiveType || "unknown"}; ${connection.downlink || "?"} Mbps; ${connection.rtt || "?"} ms RTT` : "Not exposed by this browser" }]), `<section class="result-section"><h3>Command-line equivalents</h3>${rows("", [{ value:"curl ifconfig.me" }, { value:"curl ifconfig.me/all.json" }, { value:"curl https://api.ipify.org" }])}</section>`], [{ label:"Public IP", value:result.ip }, { label:"Source", value:result.service }, { label:"Protocol", value:result.ip.includes(":") ? "IPv6" : "IPv4" }]);
    else target.innerHTML = resultCard("Public IP request blocked", "This browser or network blocked all three public-IP services. Local browser details remain available, and the direct links below can reveal the address in a new page.", [rows("Local browser details", [{ label:"User agent", value:navigator.userAgent }, { label:"Languages", value:navigator.languages?.join(", ") || navigator.language }, { label:"Timezone", value:zone }, { label:"Online status", value:navigator.onLine ? "Online" : "Offline" }]), `<section class="result-section"><h3>Open directly</h3>${externalLinks([{ label:"ifconfig.me", url:"https://ifconfig.me/" }, { label:"ipify", url:"https://api.ipify.org/" }, { label:"Amazon check IP", url:"https://checkip.amazonaws.com/" }])}</section>`], [{ label:"Public IP", value:"Restricted" }, { label:"Local status", value:navigator.onLine ? "Online" : "Offline" }]);
  };
  document.querySelector("#refresh-ip").addEventListener("click", load); load();
}

const renderers = { password: renderPassword, passphrase: renderPassphrase, supertool: renderSupertool, dns: renderDns, health: renderHealth, domain: renderDomain, ip: renderIp, connection: renderConnection, tls: renderTls, http: renderHttp, email: renderEmail, mailheaders: renderMailheaders, policy: renderPolicy };

function activate(tool) {
  navItems.forEach((item) => { const active = item.dataset.tool === tool; item.classList.toggle("active", active); if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current"); });
  renderers[tool](); history.replaceState(null, "", `#${tool}`); document.title = `CipherScope — ${document.querySelector(`[data-tool="${tool}"]`).textContent.trim()}`;
}

navItems.forEach((item) => item.addEventListener("click", () => activate(item.dataset.tool)));
const initial = location.hash.slice(1); activate(renderers[initial] ? initial : "password");
