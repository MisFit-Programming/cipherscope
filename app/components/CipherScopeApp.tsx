"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type ToolKey = "overview" | "passwords" | "connection" | "dns" | "domain" | "email" | "dashboard";

type PasswordMode = "passphrase" | "random" | "pin" | "recovery" | "token";
type CaseMode = "lower" | "title" | "upper" | "alternating" | "random";
type Recipe = {
  version: 1;
  name: string;
  mode: PasswordMode;
  count: number;
  words: number;
  length: number;
  separator: string;
  caseMode: CaseMode;
  digits: number;
  symbols: number;
  excludeAmbiguous: boolean;
  requireUpper: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  includeLower: boolean;
  includeUpper: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  customSymbols: string;
  excludedChars: string;
  prefix: string;
  suffix: string;
  substitutions: boolean;
  recoveryGroups: number;
  recoveryGroupLength: number;
  tokenPrefix: string;
  tokenFormat: "alphanumeric" | "hex" | "base64url";
};

type CheckResult = {
  tool: string;
  target: string;
  provider: string;
  checkedAt: string;
  durationMs: number;
  status: "healthy" | "warning" | "error";
  summary: string;
  findings: Array<{ label: string; value: string; status?: "ok" | "warn" | "bad" }>;
  records?: Array<Record<string, string | number>>;
  note?: string;
};

const words = [
  "amber", "anchor", "apricot", "atlas", "aurora", "badger", "bamboo", "beacon", "birch", "bison", "breeze", "brook",
  "cactus", "canary", "cedar", "cinder", "citrus", "cloud", "cobalt", "comet", "coral", "cosmos", "cricket", "dawn",
  "delta", "drift", "echo", "ember", "falcon", "fern", "fjord", "flint", "forest", "fossil", "fox", "galaxy", "garden",
  "glacier", "granite", "grove", "harbor", "hazel", "heron", "hollow", "indigo", "island", "ivory", "jasmine", "juniper",
  "kestrel", "lagoon", "lantern", "laurel", "lotus", "lunar", "maple", "marble", "meadow", "meteor", "mint", "monarch",
  "moss", "nebula", "nectar", "north", "oasis", "ocean", "olive", "onyx", "orbit", "otter", "pebble", "pine", "plover",
  "prairie", "quartz", "raven", "reef", "ridge", "river", "robin", "saffron", "sage", "sequoia", "shadow", "silver",
  "sparrow", "spruce", "stone", "summit", "tango", "thistle", "tide", "timber", "topaz", "valley", "velvet", "violet",
  "willow", "winter", "wren", "zephyr"
];

const nav: Array<{ key: ToolKey; label: string; href: string; glyph: string }> = [
  { key: "overview", label: "Overview", href: "/", glyph: "⌂" },
  { key: "passwords", label: "Password studio", href: "/passwords", glyph: "✦" },
  { key: "connection", label: "My connection", href: "/connection", glyph: "◉" },
  { key: "dns", label: "DNS explorer", href: "/dns", glyph: "◎" },
  { key: "domain", label: "Domain health", href: "/domain", glyph: "◇" },
  { key: "email", label: "Email diagnostics", href: "/email", glyph: "@" },
  { key: "dashboard", label: "Watchlist", href: "/dashboard", glyph: "◴" },
];

const networkCopy: Record<Exclude<ToolKey, "overview" | "passwords" | "connection" | "dashboard">, { eyebrow: string; title: string; description: string; placeholder: string }> = {
  dns: { eyebrow: "World propagation", title: "DNS Explorer", description: "See regionalized answers on a world map, then compare normalized evidence across independent DNS-over-HTTPS providers.", placeholder: "example.com" },
  domain: { eyebrow: "Delegation & policy", title: "Domain Health", description: "Audit authoritative DNS, DNSSEC, mail policy, certificate authority controls, and configuration gaps.", placeholder: "example.com" },
  email: { eyebrow: "Delivery policy", title: "Email Diagnostics", description: "Evaluate MX, SPF, DMARC, DKIM, MTA-STS, and TLS reporting with practical fixes.", placeholder: "example.com" },
};

function randomInt(max: number) {
  if (max <= 1) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % max;
}

function pick(source: string) { return source[randomInt(source.length)]; }
function substitute(value:string){const map:Record<string,string>={a:"@",e:"3",i:"!",o:"0",s:"$",t:"7"};return [...value].map(char=>randomInt(3)===0?(map[char.toLowerCase()]||char):char).join("");}
function transformWord(word: string, mode: CaseMode, index: number) {
  if (mode === "upper") return word.toUpperCase();
  if (mode === "title") return word[0].toUpperCase() + word.slice(1);
  if (mode === "alternating") return [...word].map((char, i) => (i + index) % 2 ? char.toUpperCase() : char).join("");
  if (mode === "random") return randomInt(2) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1);
  return word;
}

function generateOne(recipe: Recipe, dictionary: string[]) {
  const lower = recipe.excludeAmbiguous ? "abcdefghijkmnopqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
  const upper = recipe.excludeAmbiguous ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = recipe.excludeAmbiguous ? "23456789" : "0123456789";
  const symbols = recipe.customSymbols || "!@#$%&*+-=?";
  const clean=(value:string)=>[...value].filter(char=>!recipe.excludedChars.includes(char)).join("");
  if (recipe.mode === "pin") return `${recipe.prefix}${Array.from({ length: recipe.length }, () => pick(clean(nums)||"23456789")).join("")}${recipe.suffix}`;
  if (recipe.mode === "recovery") return Array.from({ length: recipe.recoveryGroups }, () => Array.from({ length: recipe.recoveryGroupLength }, () => pick("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")).join("")).join(recipe.separator||"-");
  if (recipe.mode === "token") { const size=Math.max(16,recipe.length),bytes=new Uint8Array(Math.ceil(size*.75));crypto.getRandomValues(bytes);const body=recipe.tokenFormat==="hex"?[...bytes].map(byte=>byte.toString(16).padStart(2,"0")).join("").slice(0,size):recipe.tokenFormat==="base64url"?btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"").slice(0,size):Array.from({length:size},()=>pick(clean(lower+upper+nums)||lower+upper+nums)).join("");return `${recipe.tokenPrefix}${body}`; }
  if (recipe.mode === "random") {
    const alphabet = clean((recipe.includeLower?lower:"")+(recipe.includeUpper?upper:"")+(recipe.includeNumbers?nums:"")+(recipe.includeSymbols?symbols:"")) || lower;
    const output = [
      ...(recipe.requireUpper ? [pick(upper)] : []),
      ...(recipe.requireNumber ? [pick(nums)] : []),
      ...(recipe.requireSymbol ? [pick(symbols)] : []),
    ];
    while (output.length < Math.max(8, recipe.length)) output.push(pick(alphabet));
    for (let index = output.length - 1; index > 0; index--) {
      const swapWith = randomInt(index + 1);
      [output[index], output[swapWith]] = [output[swapWith], output[index]];
    }
    return output.join("");
  }
  const selected = Array.from({ length: recipe.words }, (_, index) => {const word=transformWord(dictionary[randomInt(dictionary.length)], recipe.caseMode, index);return recipe.substitutions?substitute(word):word;});
  if (recipe.requireUpper && !selected.some(value => /[A-Z]/.test(value))) selected[0] = selected[0][0].toUpperCase() + selected[0].slice(1);
  const before = Array.from({ length: Math.max(recipe.digits, recipe.requireNumber ? 1 : 0) }, () => pick(nums)).join("");
  const after = Array.from({ length: Math.max(recipe.symbols, recipe.requireSymbol ? 1 : 0) }, () => pick(symbols)).join("");
  return `${recipe.prefix}${before}${selected.join(recipe.separator)}${after}${recipe.suffix}`;
}

function estimateEntropy(value: string, recipe: Recipe, dictionarySize: number) {
  if (recipe.mode === "passphrase") return Math.round(recipe.words * Math.log2(Math.max(dictionarySize, 2)) + (recipe.digits * 3.32) + (recipe.symbols * 3.58));
  const pool = recipe.mode === "pin" ? 10 : recipe.mode === "recovery" ? 32 : recipe.mode === "token" ? 58 : 82;
  return Math.round(value.replace(/^cs_/, "").length * Math.log2(pool));
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("cipherscope-theme");
    if (saved === "light") setTheme("light");
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("cipherscope-theme", theme); }, [theme]);
  return { theme, setTheme };
}

export default function CipherScopeApp({ initialTool }: { initialTool: ToolKey }) {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 0); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="brand"><img className="brand-logo" src="/tree-logo.png" alt=""/><span>CipherScope<small>Security workbench</small></span></div>
        <nav aria-label="Primary">
          <p className="nav-label">Workbench</p>
          {nav.map(item => <Link key={item.key} className={initialTool === item.key ? "nav-item active" : "nav-item"} href={item.href}><span>{item.glyph}</span>{item.label}</Link>)}
        </nav>
        <div className="privacy-card"><span className="pulse-dot" />RED / WHITE / BLACK<strong>Generation is browser-only.</strong></div>
        <div className="sidebar-foot"><span className="text-link">No login required</span><span className="status-chip"><i /> Systems ready</span></div>
      </aside>
      <main>
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
          <button className="search-button" onClick={() => setSearchOpen(true)}><span>⌕</span> Search tools and actions <kbd>⌘ K</kbd></button>
          <div className="top-actions"><button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle color theme">{theme === "dark" ? "☼" : "☾"}</button><span className="local-badge" title="Your settings stay in this browser">LOCAL</span></div>
        </header>
        <div className="page-wrap">
          {initialTool === "overview" && <Overview />}
          {initialTool === "passwords" && <PasswordStudio />}
          {initialTool === "connection" && <ConnectionPage />}
          {initialTool === "dashboard" && <Dashboard />}
          {!(["overview", "passwords", "connection", "dashboard"] as ToolKey[]).includes(initialTool) && <NetworkTool tool={initialTool as keyof typeof networkCopy} />}
        </div>
      </main>
      {searchOpen && <ToolSearch close={() => setSearchOpen(false)} inputRef={searchRef} />}
    </div>
  );
}

function ToolSearch({ close, inputRef }: { close: () => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [query, setQuery] = useState("");
  const filtered = nav.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
  return <div className="command-backdrop" onMouseDown={close}><div className="command" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search CipherScope"><div className="command-input"><span>⌕</span><input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools…"/><kbd>esc</kbd></div><div className="command-results">{filtered.map(item => <Link href={item.href} key={item.key} onClick={close}><span className="tool-glyph">{item.glyph}</span><span>{item.label}<small>{item.key === "passwords" ? "Private generation" : item.key === "overview" ? "Workbench home" : "Inspect and diagnose"}</small></span><b>↵</b></Link>)}</div></div></div>;
}

function Overview() {
  const tools = nav.filter(item => !["overview", "dashboard"].includes(item.key));
  const [recent, setRecent] = useState<Array<{ tool:string; target:string; status:string; checkedAt:string }>>([]);
  useEffect(() => { setRecent(JSON.parse(localStorage.getItem("cipherscope-recent") || "[]").slice(0, 4)); }, []);
  return <>
    <section className="hero"><div><span className="eyebrow"><i /> Operations, without an account</span><h1>See the internet<br/><em>across the world.</em></h1><p>Generate deeply customized secrets locally, inspect your public connection, and diagnose global DNS, domains, and mail policy with evidence you can act on.</p><div className="hero-actions"><Link className="primary-button" href="/dns">View world DNS <span>→</span></Link><Link className="secondary-button" href="/passwords">Open Password Studio</Link></div></div><div className="signal-panel"><div className="signal-head"><span>Global resolver pulse</span><b>LIVE</b></div><div className="signal-chart">{[31,48,39,62,45,78,54,85,67,93,71,81,64,76,59,88,70,96].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><div className="signal-stats"><div><small>Regions</small><strong>12</strong><span>worldwide views</span></div><div><small>Privacy</small><strong>0</strong><span>secrets transmitted</span></div><div><small>Account</small><strong>None</strong><span>required</span></div></div></div></section>
    {recent.length > 0 && <section className="recent-strip"><div><span className="eyebrow">Recent on this device</span><h2>Pick up where you left off.</h2></div><div className="recent-list">{recent.map((item,index)=><Link key={`${item.tool}-${item.target}-${index}`} href={`/${item.tool}?target=${encodeURIComponent(item.target)}`}><span className={`recent-status ${item.status}`}/><strong>{item.target}</strong><small>{item.tool.toUpperCase()} · {new Date(item.checkedAt).toLocaleString()}</small><b>Run again →</b></Link>)}</div></section>}
    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Toolbox</span><h2>One workbench. Clear answers.</h2></div><span className="quiet">Public checks are stateless by default</span></div><div className="tool-grid">{tools.map((item, index) => <Link href={item.href} className={`tool-card card-${index}`} key={item.key}><span className="tool-glyph">{item.glyph}</span><span className="tool-number">0{index + 1}</span><h3>{item.label}</h3><p>{item.key === "passwords" ? "Passphrases, passwords, PINs, recovery codes and tokens with advanced local policy controls." : item.key === "connection" ? "See your public IP, browser identity, request headers, network edge, and copyable API endpoints." : networkCopy[item.key as keyof typeof networkCopy].description}</p><span className="open-link">Open tool <b>↗</b></span></Link>)}</div></section>
    <section className="trust-strip"><span className="eyebrow">Built for trust</span><div><strong>Browser-only secrets</strong><p>Passwords never touch our network.</p></div><div><strong>No account required</strong><p>Recipes and watchlists can stay on your device.</p></div><div><strong>Honest coverage</strong><p>Regionalized views and physical probes are clearly distinguished.</p></div></section>
  </>;
}

function PasswordStudio() {
  const defaultRecipe: Recipe = { version: 1, name: "Balanced passphrase", mode: "passphrase", count: 5, words: 4, length: 20, separator: "-", caseMode: "title", digits: 2, symbols: 1, excludeAmbiguous: true, requireUpper: true, requireNumber: true, requireSymbol: true, includeLower:true, includeUpper:true, includeNumbers:true, includeSymbols:true, customSymbols:"!@#$%&*+-=?", excludedChars:"", prefix:"", suffix:"", substitutions:false, recoveryGroups:4, recoveryGroupLength:4, tokenPrefix:"cs_", tokenFormat:"alphanumeric" };
  const [recipe, setRecipe] = useState<Recipe>(defaultRecipe);
  const [customWords, setCustomWords] = useState<string[]>([]);
  const dictionary = customWords.length >= 20 ? customWords : words;
  const [outputs, setOutputs] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);
  const [savedRecipes,setSavedRecipes]=useState<Recipe[]>([]);
  useEffect(() => { setOutputs(Array.from({ length: recipe.count }, () => generateOne(recipe, dictionary))); }, []); // initial generation only
  useEffect(()=>{setSavedRecipes(JSON.parse(localStorage.getItem("cipherscope-recipes")||"[]"));},[]);
  const regenerate = () => { setOutputs(Array.from({ length: recipe.count }, () => generateOne(recipe, dictionary))); setRevealed(true); };
  const set = <K extends keyof Recipe>(key: K, value: Recipe[K]) => setRecipe(prev => ({ ...prev, [key]: value }));
  const entropy = outputs[0] ? estimateEntropy(outputs[0], recipe, dictionary.length) : 0;
  const policy = outputs[0] ? [
    { label: `At least ${Math.max(12, recipe.length)} characters`, ok: outputs[0].length >= Math.max(12, recipe.mode === "passphrase" ? 12 : recipe.length) },
    { label: "Uppercase character", ok: !recipe.requireUpper || /[A-Z]/.test(outputs[0]) },
    { label: "Number", ok: !recipe.requireNumber || /\d/.test(outputs[0]) },
    { label: "Symbol", ok: !recipe.requireSymbol || /[^A-Za-z0-9]/.test(outputs[0].replace(/^cs_/, "")) },
  ] : [];
  const copy = async (value: string, index: number) => { await navigator.clipboard.writeText(value); setCopied(index); setTimeout(() => setCopied(null), 1400); };
  const exportRecipe = () => download(`${recipe.name.toLowerCase().replace(/\W+/g, "-")}.json`, JSON.stringify(recipe, null, 2), "application/json");
  const importRecipe = async (file: File) => { try { const parsed = JSON.parse(await file.text()) as Recipe; if (parsed.version !== 1 || !["passphrase", "random", "pin", "recovery", "token"].includes(parsed.mode)) throw new Error(); setRecipe({ ...defaultRecipe, ...parsed }); } catch { alert("That recipe is not a valid CipherScope v1 file."); } };
  const importWords = async (file: File) => { const list = (await file.text()).split(/\r?\n/).map(value => value.trim()).filter(value => /^[A-Za-z][A-Za-z'-]{2,24}$/.test(value)); if (list.length < 20) return alert("A custom wordlist needs at least 20 valid words."); setCustomWords([...new Set(list)]); await storeWordlist([...new Set(list)]); };
  const applyPreset=(preset:"memorable"|"maximum"|"wifi"|"pin")=>{const recipes={memorable:{...defaultRecipe,name:"Memorable phrase",words:5,separator:"-",digits:2,symbols:1},maximum:{...defaultRecipe,name:"Maximum random",mode:"random" as PasswordMode,length:40,count:8,excludedChars:"",excludeAmbiguous:false},wifi:{...defaultRecipe,name:"Wi-Fi key",mode:"random" as PasswordMode,length:24,count:4,includeSymbols:false,requireSymbol:false},pin:{...defaultRecipe,name:"Secure PIN",mode:"pin" as PasswordMode,length:8,count:10,requireUpper:false,requireSymbol:false}};setRecipe(recipes[preset]);};
  const saveRecipe=()=>{const next=[recipe,...savedRecipes.filter(item=>item.name!==recipe.name)].slice(0,12);setSavedRecipes(next);localStorage.setItem("cipherscope-recipes",JSON.stringify(next));};
  const copyAll=async()=>{await navigator.clipboard.writeText(outputs.join("\n"));setCopied(-1);setTimeout(()=>setCopied(null),1400);};
  return <>
    <PageTitle eyebrow="Zero-transfer generation" title="Password Studio" description="Secrets are generated with your browser's cryptographic random source. Values never leave this page." badge="LOCAL ONLY" />
    <div className="studio-layout">
      <section className="panel controls-panel"><div className="panel-title"><div><span>01</span><h2>Recipe</h2></div><button className="text-button" onClick={() => setRecipe(defaultRecipe)}>Reset</button></div>
        <label className="field-label">Quick presets</label><div className="preset-row"><button onClick={()=>applyPreset("memorable")}>Memorable</button><button onClick={()=>applyPreset("maximum")}>Maximum</button><button onClick={()=>applyPreset("wifi")}>Wi-Fi</button><button onClick={()=>applyPreset("pin")}>PIN</button></div>
        <label className="field-label">Generation mode</label><div className="segmented five">{(["passphrase", "random", "pin", "recovery", "token"] as PasswordMode[]).map(mode => <button key={mode} className={recipe.mode === mode ? "selected" : ""} onClick={() => set("mode", mode)}>{mode === "random" ? "Password" : mode}</button>)}</div>
        {recipe.mode === "passphrase" && <><div className="control-row"><Range label="Words" value={recipe.words} min={2} max={12} onChange={value => set("words", value)} /><Range label="Digits" value={recipe.digits} min={0} max={8} onChange={value => set("digits", value)} /><Range label="Symbols" value={recipe.symbols} min={0} max={8} onChange={value => set("symbols", value)} /></div><div className="two-fields"><label>Separator<input value={recipe.separator} maxLength={3} onChange={e => set("separator", e.target.value)} /></label><label>Case<select value={recipe.caseMode} onChange={e => set("caseMode", e.target.value as CaseMode)}><option value="lower">lower case</option><option value="title">Title Case</option><option value="upper">UPPER CASE</option><option value="alternating">aLtErNaTiNg</option><option value="random">Random per word</option></select></label></div><label className="check standalone"><input type="checkbox" checked={recipe.substitutions} onChange={e=>set("substitutions",e.target.checked)}/><span/>Random a→@, e→3, i→!, o→0 substitutions</label></>}
        {["random", "pin", "token"].includes(recipe.mode) && <Range label={recipe.mode === "pin" ? "PIN length" : "Length"} value={recipe.length} min={recipe.mode === "pin" ? 4 : 12} max={recipe.mode === "pin" ? 16 : 128} onChange={value => set("length", value)} />}
        {recipe.mode==="random"&&<div className="charset-box"><span className="field-label">Character sets</span>{([['includeLower','Lowercase'],['includeUpper','Uppercase'],['includeNumbers','Numbers'],['includeSymbols','Symbols']] as Array<[keyof Recipe,string]>).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={Boolean(recipe[key])} onChange={e=>set(key,e.target.checked as never)}/><span/>{label}</label>)}</div>}
        {recipe.mode==="recovery"&&<div className="control-row"><Range label="Groups" value={recipe.recoveryGroups} min={2} max={10} onChange={value=>set("recoveryGroups",value)}/><Range label="Group length" value={recipe.recoveryGroupLength} min={3} max={10} onChange={value=>set("recoveryGroupLength",value)}/><label>Separator<input value={recipe.separator} maxLength={3} onChange={e=>set("separator",e.target.value)}/></label></div>}
        {recipe.mode==="token"&&<div className="two-fields"><label>Token prefix<input value={recipe.tokenPrefix} maxLength={12} onChange={e=>set("tokenPrefix",e.target.value.replace(/\s/g,""))}/></label><label>Encoding<select value={recipe.tokenFormat} onChange={e=>set("tokenFormat",e.target.value as Recipe["tokenFormat"])}><option value="alphanumeric">Alphanumeric</option><option value="hex">Hexadecimal</option><option value="base64url">Base64 URL-safe</option></select></label></div>}
        <div className="two-fields"><label>Prefix<input value={recipe.prefix} maxLength={16} onChange={e=>set("prefix",e.target.value)}/></label><label>Suffix<input value={recipe.suffix} maxLength={16} onChange={e=>set("suffix",e.target.value)}/></label></div>
        <div className="two-fields"><label>Allowed symbols<input value={recipe.customSymbols} maxLength={32} onChange={e=>set("customSymbols",e.target.value)}/></label><label>Exclude characters<input value={recipe.excludedChars} maxLength={64} onChange={e=>set("excludedChars",e.target.value)}/></label></div>
        <Range label="Number of outputs" value={recipe.count} min={1} max={100} onChange={value => set("count", value)} />
        <div className="policy-box"><div><span className="field-label">Policy</span><small>Requirements are enforced, not merely scored.</small></div>{([['requireUpper','Uppercase'],['requireNumber','Number'],['requireSymbol','Symbol']] as Array<[keyof Recipe,string]>).map(([key, label]) => <label className="check" key={key}><input type="checkbox" checked={Boolean(recipe[key])} onChange={e => set(key, e.target.checked as never)} /><span />{label}</label>)}</div>
        <label className="check standalone"><input type="checkbox" checked={recipe.excludeAmbiguous} onChange={e => set("excludeAmbiguous", e.target.checked)} /><span />Exclude ambiguous characters (0, O, 1, l)</label>
        <div className="file-actions"><button className="secondary-button" onClick={saveRecipe}>Save on device</button><label className="secondary-button file-button">Import recipe<input type="file" accept="application/json" onChange={e => e.target.files?.[0] && importRecipe(e.target.files[0])}/></label><button className="secondary-button" onClick={exportRecipe}>Export recipe</button><label className="secondary-button file-button">Custom words<input type="file" accept=".txt,text/plain" onChange={e => e.target.files?.[0] && importWords(e.target.files[0])}/></label></div>
        {savedRecipes.length>0&&<div className="saved-recipes"><span className="field-label">Saved recipes</span>{savedRecipes.map(item=><button key={item.name} onClick={()=>setRecipe({...defaultRecipe,...item})}>{item.name}<small>{item.mode}</small></button>)}</div>}
      </section>
      <section className="panel output-panel"><div className="panel-title"><div><span>02</span><h2>Generated securely</h2></div><div className="output-actions"><button className="text-button" onClick={copyAll}>{copied===-1?"Copied all":"Copy all"}</button><button className="text-button" onClick={() => setRevealed(!revealed)}>{revealed ? "Hide" : "Reveal"}</button><button className="primary-button small" onClick={regenerate}>Regenerate ↻</button></div></div>
        <div className="secret-list" aria-live="polite">{outputs.map((value, index) => <div className="secret-row" key={`${value}-${index}`}><code className={revealed ? "" : "concealed"}>{revealed ? value : "••••••••••••••••••••"}</code><span>{value.length} chars</span><button onClick={() => copy(value, index)}>{copied === index ? "Copied" : "Copy"}</button></div>)}</div>
        <div className="strength-grid"><div className="entropy-dial" style={{ "--score": `${Math.min(entropy, 100) * 3.6}deg` } as React.CSSProperties}><span><strong>{entropy}</strong><small>bits</small></span></div><div><span className="eyebrow">Estimated entropy</span><h3>{entropy >= 70 ? "Strong against guessing" : entropy >= 50 ? "Solid for most uses" : "Increase length"}</h3><p>Estimate assumes an attacker knows the recipe and dictionary. It is not a breach or reuse check.</p></div><div className="policy-list">{policy.map(item => <span key={item.label} className={item.ok ? "pass" : "fail"}><i>{item.ok ? "✓" : "×"}</i>{item.label}</span>)}</div></div>
        <div className="privacy-note"><span>◉</span><div><strong>Nothing generated here is stored.</strong><p>Recipes may be exported; values are intentionally unrecoverable after you close this page.</p></div></div>
      </section>
    </div>
  </>;
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="range-control"><span>{label}<b>{value}</b></span><input type="range" value={value} min={min} max={max} onChange={e => onChange(Number(e.target.value))}/></label>;
}

type ConnectionInfo={ip:string;ipVersion:string;userAgent:string;language:string;method:string;encoding:string;mime:string;forwarded:string;country:string;city:string;region:string;timezone:string;colo:string;asn:string;organization:string;protocol:string;tls:string;ray:string;checkedAt:string};
function ConnectionPage(){
  const[info,setInfo]=useState<ConnectionInfo|null>(null);const[error,setError]=useState("");const[copied,setCopied]=useState("");
  const load=async()=>{setError("");try{const response=await fetch("/api/connection",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not inspect this connection.");setInfo(data);}catch(cause){setError(cause instanceof Error?cause.message:"Could not inspect this connection.");}};
  useEffect(()=>{load();},[]);const copy=async(label:string,value:string)=>{await navigator.clipboard.writeText(value);setCopied(label);setTimeout(()=>setCopied(""),1200);};
  const rows=info?[['IP address',info.ip],['IP version',info.ipVersion],['Network / ASN',[info.asn,info.organization].filter(Boolean).join(' · ')||'Not published'],['Edge location',[info.city,info.region,info.country].filter(Boolean).join(', ')||'Not published'],['Timezone',info.timezone||'Not published'],['Cloud edge',info.colo||'Not published'],['HTTP protocol',info.protocol||'Not published'],['TLS',info.tls||'Not published'],['User agent',info.userAgent],['Language',info.language||'Not sent'],['Encoding',info.encoding||'Not sent'],['Accepted content',info.mime||'Not sent'],['Forwarded chain',info.forwarded||'Not exposed'],['Request ID',info.ray||'Not published']] as Array<[string,string]>:[];
  return <><PageTitle eyebrow="Your public network edge" title="My Connection" description="A privacy-conscious view of the public IP and request details this site can see—plus simple endpoints for scripts and terminals." badge="LIVE REQUEST"/>{error&&<div className="error-banner">{error}</div>}{!info&&!error&&<LoadingResults/>}{info&&<><section className="connection-hero"><span>YOUR PUBLIC IP</span><strong>{info.ip}</strong><div><button className="primary-button" onClick={()=>copy('ip',info.ip)}>{copied==='ip'?'Copied':'Copy IP'}</button><button className="secondary-button" onClick={load}>Refresh</button></div></section><div className="connection-layout"><section className="panel connection-table"><div className="panel-title"><div><span>01</span><h2>Your connection</h2></div><small>{new Date(info.checkedAt).toLocaleString()}</small></div>{rows.map(([label,value])=><div className="connection-row" key={label}><span>{label}</span><code>{value}</code><button onClick={()=>copy(label,value)}>{copied===label?'✓':'Copy'}</button></div>)}</section><section className="panel cli-panel"><span className="eyebrow">Command line</span><h2>Script-friendly endpoints</h2><p>Use plain text for quick shell scripts or JSON for the complete request snapshot.</p>{[['Public IP','/api/connection?field=ip'],['User agent','/api/connection?field=ua'],['Country','/api/connection?field=country'],['Everything','/api/connection?format=json']].map(([label,path])=><div className="endpoint" key={path}><span>{label}</span><code>curl {typeof window!=="undefined"?window.location.host:"cipherscope"}{path}</code><a href={path} target="_blank" rel="noreferrer">Open ↗</a></div>)}<div className="evidence-note"><span>Privacy</span>No connection history is stored. Refreshing creates a new request and updates only this screen.</div></section></div></> }</>;
}

function NetworkTool({ tool }: { tool: keyof typeof networkCopy }) {
  const copy = networkCopy[tool];
  const [target, setTarget] = useState("example.com");
  const [recordType, setRecordType] = useState("A");
  const [selector, setSelector] = useState("google");
  const [expected, setExpected] = useState("");
  const [expectedMode, setExpectedMode] = useState<"contains"|"exact"|"regex">("contains");
  const [refreshSeconds, setRefreshSeconds] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { const params = new URLSearchParams(window.location.search); const sharedTarget = params.get("target"); const sharedRecord = params.get("record"); if (sharedTarget) setTarget(sharedTarget); if (sharedRecord) setRecordType(sharedRecord.toUpperCase()); }, []);
  const run = async () => { setLoading(true); setError(""); try { const response = await fetch(`/api/checks/${tool}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target, recordType, selector, expected, expectedMode }) }); const data = await response.json() as CheckResult & { error?: string }; if (!response.ok) throw new Error(data.error || "Check failed"); setResult(data); rememberCheck(tool, target, data.status); } catch (cause) { setError(cause instanceof Error ? cause.message : "Check failed"); } finally { setLoading(false); } };
  useEffect(() => { if (!refreshSeconds || !result) return; const timer = window.setInterval(run, refreshSeconds * 1000); return () => window.clearInterval(timer); }, [refreshSeconds, result, target, recordType, expected, expectedMode]);
  const share = async () => { const url = new URL(window.location.href); url.searchParams.set("target", target); if (tool === "dns") url.searchParams.set("record", recordType); await navigator.clipboard.writeText(url.toString()); setShareCopied(true); setTimeout(()=>setShareCopied(false),1400); };
  const exportPng = () => result && resultToPng(result);
  return <><PageTitle eyebrow={copy.eyebrow} title={copy.title} description={copy.description} badge="STATELESS" />
    <section className="query-card"><div className="query-main"><label>Domain or hostname<input value={target} onChange={e => setTarget(e.target.value)} placeholder={copy.placeholder} onKeyDown={e => e.key === "Enter" && run()}/></label>{tool === "dns" && <label className="compact-select">Record<select value={recordType} onChange={e => setRecordType(e.target.value)}>{["A","AAAA","CNAME","MX","NS","PTR","SRV","SOA","TXT","CAA","DS","DNSKEY"].map(type => <option key={type}>{type}</option>)}</select></label>}{tool === "email" && <label className="compact-select">DKIM selector<input value={selector} onChange={e => setSelector(e.target.value)} /></label>}<button className="primary-button run-button" onClick={run} disabled={loading}>{loading ? "Checking…" : "Run check →"}</button></div>{tool === "dns" && <div className="query-options"><label>Expected value <input value={expected} onChange={e => setExpected(e.target.value)} placeholder="Optional expected answer"/></label><label className="inline-select">Match<select value={expectedMode} onChange={e=>setExpectedMode(e.target.value as typeof expectedMode)}><option value="contains">Contains</option><option value="exact">Exact</option><option value="regex">Regex</option></select></label><label className="inline-select">Refresh<select value={refreshSeconds} onChange={e=>setRefreshSeconds(Number(e.target.value))}><option value="0">Off</option><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option></select></label><span>12 regional views</span></div>}</section>
    {error && <div className="error-banner"><b>Check could not complete.</b> {error}</div>}
    {!result && !loading && <EmptyResults tool={tool} onExample={run}/>} {loading && <LoadingResults />}
    {result && !loading && <section className="results"><div className="result-head"><div><span className={`result-status ${result.status}`}>{result.status}</span><h2>{result.summary}</h2><p>{result.target} · {result.provider} · {result.durationMs} ms{refreshSeconds ? ` · refreshes every ${refreshSeconds}s` : ""}</p></div><div className="result-actions"><button onClick={share}>{shareCopied ? "Copied" : "Share"}</button><button onClick={() => download(`cipherscope-${tool}.json`, JSON.stringify(result, null, 2), "application/json")}>JSON</button><button onClick={() => downloadResultCsv(result)}>CSV</button><button onClick={exportPng}>PNG</button><button onClick={() => saveWatch(tool, target)}>+ Watch</button></div></div><div className="finding-grid">{result.findings.map(item => <div className="finding" key={`${item.label}-${item.value}`}><span>{item.label}<i className={item.status || "ok"}/></span><strong>{item.value}</strong></div>)}</div>{tool === "dns" && result.records && <WorldPropagation records={result.records}/>} {result.records && result.records.length > 0 && <div className="record-table-wrap"><table><thead><tr>{Object.keys(result.records[0]).filter(key => !["lat","lon"].includes(key)).map(key => <th key={key}>{key}</th>)}</tr></thead><tbody>{result.records.map((row, index) => <tr key={index}>{Object.entries(row).filter(([key]) => !["lat","lon"].includes(key)).map(([, value], cell) => <td key={cell}>{String(value)}</td>)}</tr>)}</tbody></table></div>} {result.note && <div className="evidence-note"><span>Evidence note</span>{result.note}</div>}</section>}
  </>;
}

function PageTitle({ eyebrow, title, description, badge }: { eyebrow: string; title: string; description: string; badge: string }) { return <div className="page-title"><div><span className="eyebrow"><i />{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><span className="outline-badge">{badge}</span></div>; }
function EmptyResults({ tool, onExample }: { tool: string; onExample: () => void }) { return <section className="empty-results"><div className="radar"><i/><i/><i/><span>+</span></div><h2>Ready to inspect</h2><p>Run a check to see normalized evidence and actionable findings. No account is required and queries are not saved by CipherScope.</p><button className="text-button" onClick={onExample}>Run the example query →</button><div className="explain-grid"><div><span>01</span><strong>{tool === "dns" ? "Worldwide propagation" : "Independent evidence"}</strong><p>{tool === "dns" ? "Map regionalized DNS answers across twelve global viewpoints, plus independent provider comparisons." : "Results retain their source and timing context."}</p></div><div><span>02</span><strong>Safe outbound checks</strong><p>Private networks, metadata services, and reserved addresses are blocked.</p></div><div><span>03</span><strong>Exportable results</strong><p>Download JSON, CSV, or a compact visual report.</p></div></div></section>; }
function LoadingResults() { return <section className="loading-results"><div className="loading-line"/><div className="loading-grid">{[1,2,3,4,5,6].map(i => <i key={i}/>)}</div></section>; }

function WorldPropagation({ records }: { records: Array<Record<string, string | number>> }) {
  const points = records.filter(row => typeof row.lat === "number" && typeof row.lon === "number");
  if (!points.length) return null;
  return <section className="world-propagation"><div className="world-head"><div><span className="eyebrow">Regional DNS view</span><h3>World propagation</h3></div><div className="map-legend"><span><i className="resolved"/>Resolved</span><span><i className="mismatch"/>Different / missing</span></div></div><div className="world-map" role="img" aria-label={`DNS propagation map with ${points.length} regional viewpoints`}><span className="continent americas">AMERICAS</span><span className="continent europe">EUROPE</span><span className="continent africa">AFRICA</span><span className="continent asia">ASIA</span><span className="continent oceania">OCEANIA</span>{points.map((row, index) => { const left = ((Number(row.lon) + 180) / 360) * 100; const top = ((90 - Number(row.lat)) / 180) * 100; const ok = row.status === "resolved" || row.status === "matched"; return <span key={`${row.location}-${index}`} className={`map-point ${ok ? "resolved" : "mismatch"}`} style={{ left: `${left}%`, top: `${top}%` }} title={`${row.location}: ${row.answer}`}><i/><b>{String(row.code || index + 1)}</b></span>; })}</div><p className="map-caption">Regional answers use EDNS Client Subnet hints through Google Public DNS. They show how an authoritative/CDN answer varies for those regions; they are not physical probes in each city.</p></section>;
}

function Dashboard() {
  const [watches, setWatches] = useState<Array<{ tool: string; target: string; created: string }>>([]);
  useEffect(() => { setWatches(JSON.parse(localStorage.getItem("cipherscope-watches") || "[]")); }, []);
  const exportLocal = () => download("cipherscope-local-settings.json", JSON.stringify({ version: 1, watches, theme: localStorage.getItem("cipherscope-theme"), exportedAt: new Date().toISOString() }, null, 2), "application/json");
  const importLocal = async (file: File) => { try { const parsed = JSON.parse(await file.text()); if (parsed.version !== 1 || !Array.isArray(parsed.watches)) throw new Error(); localStorage.setItem("cipherscope-watches", JSON.stringify(parsed.watches)); setWatches(parsed.watches); } catch { alert("That is not a valid CipherScope settings file."); } };
  const removeWatch = (index:number) => { const next=watches.filter((_,itemIndex)=>itemIndex!==index); setWatches(next); localStorage.setItem("cipherscope-watches",JSON.stringify(next)); };
  const clearWatches = () => { setWatches([]); localStorage.removeItem("cipherscope-watches"); };
  return <><PageTitle eyebrow="Saved operations" title="Watchlist" description="Keep important assets close without creating an account. Everything on this page stays in this browser unless you export it." badge="NO LOGIN"/><div className="dashboard-grid"><section className="panel watch-panel"><div className="panel-title"><div><span>01</span><h2>Saved checks</h2></div><div className="watch-head-actions"><span className="count-badge">{watches.length}</span>{watches.length>0&&<button className="text-button" onClick={clearWatches}>Clear all</button>}</div></div>{watches.length ? <div className="watch-list">{watches.map((watch, index) => <div key={`${watch.target}-${index}`}><span className="tool-glyph">{nav.find(item => item.key === watch.tool)?.glyph || "◇"}</span><div><strong>{watch.target}</strong><small>{watch.tool} · added {new Date(watch.created).toLocaleDateString()}</small></div><div className="watch-actions"><Link href={`/${watch.tool}?target=${encodeURIComponent(watch.target)}`}>Run →</Link><button onClick={()=>removeWatch(index)} aria-label={`Remove ${watch.target}`}>×</button></div></div>)}</div> : <div className="mini-empty"><span>◴</span><h3>No saved checks yet</h3><p>Add a domain or IP from any result page.</p><Link className="secondary-button" href="/dns">Open DNS Explorer</Link></div>}</section><section className="panel monitor-panel"><span className="eyebrow">Local-first workspace</span><h2>Your tools work without an identity provider.</h2><p>Save targets and recipes to this browser, export a portable settings file, and import it on another device. No Auth0, Google, Microsoft, or email address required.</p><div className="adapter-flow"><span>Browser</span><b>→</b><span>Local storage</span><b>→</b><span>JSON export</span></div><div className="local-actions"><button className="primary-button" onClick={exportLocal}>Export settings</button><label className="secondary-button file-button">Import settings<input type="file" accept="application/json" onChange={e => e.target.files?.[0] && importLocal(e.target.files[0])}/></label></div></section></div></>;
}

function rememberCheck(tool: string, target: string, status: string) { const previous = JSON.parse(localStorage.getItem("cipherscope-recent") || "[]"); localStorage.setItem("cipherscope-recent", JSON.stringify([{ tool, target, status, checkedAt: new Date().toISOString() }, ...previous].slice(0, 10))); }
function saveWatch(tool: string, target: string) { const watches = JSON.parse(localStorage.getItem("cipherscope-watches") || "[]") as Array<{tool:string;target:string;created:string}>; if (!watches.some(w => w.tool === tool && w.target === target)) watches.unshift({ tool, target, created: new Date().toISOString() }); localStorage.setItem("cipherscope-watches", JSON.stringify(watches)); alert("Added to your device watchlist."); }
function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function downloadResultCsv(result: CheckResult) { const rows = result.records?.length ? result.records : result.findings.map(item => ({ label: item.label, value: item.value, status: item.status || "ok" })); const keys = Object.keys(rows[0] || { result: "No records" }); const csv = [keys.join(","), ...rows.map(row => keys.map(key => `"${String((row as Record<string, unknown>)[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n"); download(`cipherscope-${result.tool}.csv`, csv, "text/csv"); }
function resultToPng(result: CheckResult) { const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 800; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.fillStyle = "#070708"; ctx.fillRect(0,0,1400,800); ctx.fillStyle = "#e21d2d"; ctx.font = "600 28px ui-monospace"; ctx.fillText("CIPHERSCOPE / EVIDENCE REPORT",70,80); ctx.fillStyle = "#ffffff"; ctx.font = "700 62px system-ui"; ctx.fillText(result.target,70,170); ctx.font = "400 26px system-ui"; ctx.fillStyle = "#aaaaaf"; ctx.fillText(`${result.tool.toUpperCase()} · ${result.provider} · ${new Date(result.checkedAt).toLocaleString()}`,70,220); result.findings.slice(0,6).forEach((finding,index) => { const x = 70 + (index%2)*640; const y = 330 + Math.floor(index/2)*130; ctx.fillStyle="#17171a"; ctx.fillRect(x,y-50,590,100); ctx.fillStyle="#aaaaaf"; ctx.font="500 18px system-ui"; ctx.fillText(finding.label.toUpperCase(),x+24,y-14); ctx.fillStyle="#ffffff"; ctx.font="600 25px system-ui"; ctx.fillText(finding.value.slice(0,38),x+24,y+24); }); const anchor = document.createElement("a"); anchor.download=`cipherscope-${result.tool}.png`; anchor.href=canvas.toDataURL("image/png"); anchor.click(); }
async function storeWordlist(list: string[]) { return new Promise<void>((resolve, reject) => { const request = indexedDB.open("cipherscope-local", 1); request.onupgradeneeded = () => request.result.createObjectStore("wordlists"); request.onerror = () => reject(request.error); request.onsuccess = () => { const transaction = request.result.transaction("wordlists", "readwrite"); transaction.objectStore("wordlists").put(list, "active"); transaction.oncomplete = () => { request.result.close(); resolve(); }; }; }); }
