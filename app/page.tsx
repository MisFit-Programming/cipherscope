"use client";

import { useCallback, useState } from "react";

type ToolId = "password" | "passphrase" | "dns" | "domain" | "ip" | "tls" | "http" | "email";
type InspectResult = { ok: boolean; title?: string; summary?: string; error?: string; facts?: Array<{ label: string; value: string }>; sections?: Array<{ title: string; rows: Array<{ label?: string; value: string; tone?: string }> }> };

const TOOL_GROUPS = [
  { label: "Create", items: [["password", "Password generator", "✦"], ["passphrase", "Passphrase builder", "≋"]] },
  { label: "Inspect", items: [["dns", "DNS records", "◎"], ["domain", "Domain & RDAP", "◇"], ["ip", "IP intelligence", "⌖"], ["tls", "TLS certificate", "◈"], ["http", "HTTP headers", "≡"], ["email", "Email security", "@"]] },
] as const;

const TOOL_COPY: Record<Exclude<ToolId, "password" | "passphrase">, { eyebrow: string; title: string; description: string; placeholder: string; button: string; hint: string }> = {
  dns: { eyebrow: "DNS explorer", title: "Resolve public DNS records", description: "Query authoritative-looking public results across common record types and see TTLs in one view.", placeholder: "example.com", button: "Resolve records", hint: "Enter a hostname without a path, such as example.com." },
  domain: { eyebrow: "Registration data", title: "Inspect a domain", description: "Read normalized RDAP registration details, status flags, registrar data, and nameservers.", placeholder: "example.com", button: "Inspect domain", hint: "RDAP is the modern replacement for traditional WHOIS." },
  ip: { eyebrow: "Network context", title: "Understand an IP address", description: "Resolve a hostname when needed, then review network ownership, approximate region, and routing context.", placeholder: "1.1.1.1 or example.com", button: "Inspect IP", hint: "Location data is approximate and should not identify a person." },
  tls: { eyebrow: "Certificate transparency", title: "Review TLS certificates", description: "Check HTTPS reachability and recent public certificate-transparency entries for a hostname.", placeholder: "example.com", button: "Check TLS", hint: "Certificate history comes from public transparency logs." },
  http: { eyebrow: "Web response", title: "Audit HTTP security headers", description: "Follow the first public response and score common browser security protections and redirect behavior.", placeholder: "https://example.com", button: "Analyze headers", hint: "Only public HTTP and HTTPS destinations are accepted." },
  email: { eyebrow: "Mail posture", title: "Check email security", description: "Review MX routing plus SPF, DMARC, and common DKIM selectors from public DNS.", placeholder: "example.com", button: "Check email", hint: "A missing DKIM result may simply mean a provider uses a custom selector." },
};

const WORDS = ["amber","anchor","apple","atlas","basil","beacon","birch","breeze","brook","cedar","cinder","cloud","cobalt","comet","coral","delta","ember","fern","field","fjord","flint","forest","frost","grove","harbor","hazel","island","ivory","juniper","lagoon","lark","maple","meadow","mint","moon","moss","north","ocean","olive","orbit","pearl","pine","quartz","rain","reed","river","sage","shore","solar","spruce","stone","summit","tide","trail","vale","violet","wave","willow","wind","winter"];

function randomChoice(source: string) {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return source[value[0] % source.length];
}

function randomWord() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return WORDS[value[0] % WORDS.length];
}

function makePassword(length: number, options: Record<string, boolean>) {
  let alphabet = "";
  if (options.uppercase) alphabet += "ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (options.lowercase) alphabet += "abcdefghijkmnopqrstuvwxyz";
  if (options.numbers) alphabet += "23456789";
  if (options.symbols) alphabet += "!@#$%^&*_-+=";
  if (!options.ambiguous) alphabet = alphabet.replace(/[Il1O0]/g, "");
  return Array.from({ length }, () => randomChoice(alphabet || "abcdefghijkmnopqrstuvwxyz")).join("");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }
  return <button className="copy-button" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>;
}

function PasswordTool() {
  const [length, setLength] = useState(20);
  const [options, setOptions] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true, ambiguous: false });
  const [password, setPassword] = useState("Cedar!Orbit7Maple#42");
  const alphabetSize = (options.uppercase ? 24 : 0) + (options.lowercase ? 24 : 0) + (options.numbers ? 8 : 0) + (options.symbols ? 12 : 0);
  const entropy = Math.round(length * Math.log2(Math.max(alphabetSize, 1)));
  const refresh = useCallback(() => setPassword(makePassword(length, options)), [length, options]);
  function updateOption(key: keyof typeof options) { const next = { ...options, [key]: !options[key] }; if (!next.uppercase && !next.lowercase && !next.numbers && !next.symbols) return; setOptions(next); setPassword(makePassword(length, next)); }
  function updateLength(value: number) { setLength(value); setPassword(makePassword(value, options)); }
  return <>
    <ToolHeader eyebrow="Password lab" title="Generate a stronger password" description="Create high-entropy credentials without sending anything across the network." action={<button className="ghost-button" onClick={refresh}>↻ New password</button>} />
    <div className="generator-card">
      <div className="output-label"><span>Generated password</span><span className="strength">{entropy >= 100 ? "Excellent" : entropy >= 70 ? "Strong" : "Good"} · {entropy} bits</span></div>
      <div className="password-output"><code>{password}</code><CopyButton value={password} /></div>
      <div className="meter" aria-label={`${entropy} bits of estimated entropy`}><span style={{ width: `${Math.min(100, entropy / 1.3)}%` }} /></div>
      <div className="control-block"><div className="control-heading"><label htmlFor="length">Length</label><output>{length} characters</output></div><input id="length" type="range" min="8" max="64" value={length} onChange={(event) => updateLength(Number(event.target.value))} /><div className="range-labels"><span>8</span><span>64</span></div></div>
      <div className="option-grid">{(["uppercase","lowercase","numbers","symbols"] as const).map((key) => <label className="check-option" key={key}><input type="checkbox" checked={options[key]} onChange={() => updateOption(key)} /><span>{key[0].toUpperCase() + key.slice(1)}</span></label>)}</div>
      <label className="inline-option"><input type="checkbox" checked={!options.ambiguous} onChange={() => updateOption("ambiguous")} /> Avoid ambiguous characters like I, l, O, and 0</label>
    </div>
    <TrustGrid />
  </>;
}

function PassphraseTool() {
  const [count, setCount] = useState(5);
  const [separator, setSeparator] = useState("-");
  const [caps, setCaps] = useState(true);
  const [number, setNumber] = useState(true);
  const build = useCallback(() => {
    const picked = Array.from({ length: count }, randomWord);
    const words = picked.map((word) => caps ? word[0].toUpperCase() + word.slice(1) : word);
    return words.join(separator) + (number ? Math.floor(10 + Math.random() * 90) : "");
  }, [caps, count, number, separator]);
  const [phrase, setPhrase] = useState("Cobalt-River-Maple-Quartz-Trail42");
  return <>
    <ToolHeader eyebrow="Memorable secrets" title="Build a secure passphrase" description="Combine unrelated words into a credential that is easier to type and remember." action={<button className="ghost-button" onClick={() => setPhrase(build())}>↻ New passphrase</button>} />
    <div className="generator-card">
      <div className="output-label"><span>Generated passphrase</span><span className="strength">{count >= 5 ? "Excellent" : "Strong"}</span></div>
      <div className="password-output"><code>{phrase}</code><CopyButton value={phrase} /></div>
      <div className="form-grid three"><label>Words<select value={count} onChange={(event) => setCount(Number(event.target.value))}>{[3,4,5,6,7,8].map((value) => <option key={value}>{value}</option>)}</select></label><label>Separator<select value={separator} onChange={(event) => setSeparator(event.target.value)}><option value="-">Hyphen</option><option value=".">Period</option><option value="_">Underscore</option><option value=" ">Space</option></select></label><div className="toggle-stack"><label><input type="checkbox" checked={caps} onChange={() => setCaps(!caps)} /> Capitalize words</label><label><input type="checkbox" checked={number} onChange={() => setNumber(!number)} /> Add two digits</label></div></div>
      <button className="primary full" onClick={() => setPhrase(build())}>Generate with these settings</button>
    </div>
    <div className="notice"><strong>Use a password manager.</strong> Passphrases are ideal for master passwords and credentials you need to type. Keep each one unique.</div>
  </>;
}

function ToolHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function TrustGrid() { return <div className="trust-grid"><article><span>01</span><div><h3>Cryptographically random</h3><p>Uses your browser’s secure random-number generator.</p></div></article><article><span>02</span><div><h3>Never transmitted</h3><p>Generation and copying happen only on this device.</p></div></article><article><span>03</span><div><h3>Easy to audit</h3><p>Clear controls show exactly what goes into each password.</p></div></article></div>; }

function ResultView({ result }: { result: InspectResult }) {
  if (!result.ok) return <div className="result-card error-state"><span aria-hidden="true">!</span><div><h2>We couldn’t complete that check</h2><p>{result.error}</p></div></div>;
  return <div className="result-card" aria-live="polite">
    <div className="result-head"><div><span className="status-dot" /> Check complete</div><CopyButton value={JSON.stringify(result, null, 2)} /></div>
    <h2>{result.title}</h2>{result.summary && <p className="result-summary">{result.summary}</p>}
    {!!result.facts?.length && <dl className="facts">{result.facts.map((fact, index) => <div key={`${fact.label}-${index}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
    {result.sections?.map((section, index) => <section className="result-section" key={`${section.title}-${index}`}><h3>{section.title}</h3><div className="result-rows">{section.rows.length ? section.rows.map((row, rowIndex) => <div className="result-row" key={rowIndex}>{row.label && <span>{row.label}</span>}<code>{row.value}</code>{row.tone && <b className={`tone ${row.tone}`}>{row.tone}</b>}</div>) : <p className="empty-row">No public records found.</p>}</div></section>)}
  </div>;
}

function InspectorTool({ tool }: { tool: Exclude<ToolId, "password" | "passphrase"> }) {
  const copy = TOOL_COPY[tool];
  const [input, setInput] = useState("");
  const [recordType, setRecordType] = useState("ALL");
  const [result, setResult] = useState<InspectResult | null>(null);
  const [loading, setLoading] = useState(false);
  async function inspect(event: React.FormEvent) {
    event.preventDefault(); if (!input.trim()) return;
    setLoading(true); setResult(null);
    try { const response = await fetch(`/api/inspect?tool=${tool}&target=${encodeURIComponent(input.trim())}&recordType=${recordType}`); const data = await response.json() as InspectResult; setResult(data); }
    catch { setResult({ ok: false, error: "The diagnostics service is temporarily unreachable. Check your connection and try again." }); }
    finally { setLoading(false); }
  }
  return <>
    <ToolHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
    <form className="lookup-card" onSubmit={inspect}>
      <label htmlFor="lookup-target">{tool === "http" ? "Public URL" : tool === "ip" ? "IP address or hostname" : "Domain or hostname"}</label>
      <div className="lookup-row"><input id="lookup-target" value={input} onChange={(event) => setInput(event.target.value)} placeholder={copy.placeholder} spellCheck="false" autoCapitalize="none" />{tool === "dns" && <select aria-label="Record type" value={recordType} onChange={(event) => setRecordType(event.target.value)}>{["ALL","A","AAAA","CNAME","MX","TXT","NS","CAA"].map((type) => <option key={type}>{type}</option>)}</select>}<button className="primary" disabled={loading || !input.trim()}>{loading ? <><span className="spinner" /> Checking</> : copy.button}</button></div>
      <p>{copy.hint}</p>
    </form>
    {loading && <div className="loading-card"><span className="spinner dark" /><div><strong>Running public checks…</strong><p>This usually takes a few seconds.</p></div></div>}
    {result && <ResultView result={result} />}
    {!loading && !result && <div className="empty-state"><div className="scope-rings" aria-hidden="true"><span>+</span></div><h2>Ready when you are</h2><p>Your results will appear here with the important signals explained in plain language.</p></div>}
  </>;
}

export default function Home() {
  const [active, setActive] = useState<ToolId>("password");
  const title = active === "password" ? "Password generator" : active === "passphrase" ? "Passphrase builder" : TOOL_COPY[active].title;
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="CipherScope home"><span className="brand-mark" aria-hidden="true">C</span><span>CipherScope</span><span className="brand-badge">Workbench</span></a><div className="privacy-pill"><span /> Privacy-first tools</div></header>
    <div className="workspace" id="top">
      <aside className="sidebar" aria-label="Tools"><p className="sidebar-kicker">Security toolkit</p>{TOOL_GROUPS.map((group) => <section className="nav-group" key={group.label}><h2>{group.label}</h2>{group.items.map(([id, label, icon]) => <button aria-current={active === id ? "page" : undefined} className={`nav-item ${active === id ? "active" : ""}`} key={id} onClick={() => setActive(id as ToolId)}><span aria-hidden="true">{icon}</span>{label}</button>)}</section>)}<div className="sidebar-note"><strong>No accounts. No tracking.</strong><span>Generated secrets stay on this device. Diagnostics use public network data.</span></div></aside>
      <section className="content" aria-label={title}>{active === "password" ? <PasswordTool /> : active === "passphrase" ? <PassphraseTool /> : <InspectorTool key={active} tool={active} />}</section>
    </div>
    <footer><span>CipherScope</span><span>Public signals are informative, not a substitute for a professional security assessment.</span></footer>
  </main>;
}
