type Row = { label?: string; value: string; tone?: string };

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "CAA"];
const PRIVATE_V4 = /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|224\.|240\.)/;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanHost(input: string) {
  const raw = input.trim().toLowerCase().replace(/\.$/, "");
  if (!raw || raw.length > 253 || /[\s/@]/.test(raw) || !/^[a-z0-9.-]+$/.test(raw)) throw new Error("Enter a valid public hostname, such as example.com.");
  if (raw === "localhost" || raw.endsWith(".local") || raw.endsWith(".internal") || PRIVATE_V4.test(raw) || raw === "::1") throw new Error("Private and local network destinations are not supported.");
  return raw;
}

function cleanUrl(input: string) {
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error("Enter a standard public HTTP or HTTPS URL without credentials or a custom port.");
  cleanHost(url.hostname);
  return url;
}

async function timedFetch(url: string, init?: RequestInit, timeout = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function dnsQuery(name: string, type: string) {
  const response = await timedFetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" } });
  if (!response.ok) throw new Error("The public DNS resolver did not return a usable response.");
  return await response.json() as { Status?: number; Answer?: Array<{ name: string; type: number; TTL: number; data: string }> };
}

function dnsRows(answer?: Array<{ name: string; TTL: number; data: string }>): Row[] {
  return (answer ?? []).map((record) => ({ label: `${record.name.replace(/\.$/, "")} · TTL ${record.TTL}s`, value: record.data.replace(/^"|"$/g, "") }));
}

async function inspectDns(host: string, requested: string) {
  const types = requested === "ALL" || !DNS_TYPES.includes(requested) ? DNS_TYPES : [requested];
  const results = await Promise.all(types.map(async (type) => ({ type, data: await dnsQuery(host, type) })));
  const total = results.reduce((sum, result) => sum + (result.data.Answer?.length ?? 0), 0);
  return { ok: true, title: host, summary: `${total} public record${total === 1 ? "" : "s"} found across ${types.length} record type${types.length === 1 ? "" : "s"}.`, facts: [{ label: "Resolver", value: "Cloudflare DNS over HTTPS" }, { label: "Response", value: results.every((item) => item.data.Status === 0) ? "No resolver errors" : "Some types returned no answer" }], sections: results.map((result) => ({ title: result.type, rows: dnsRows(result.data.Answer) })) };
}

async function inspectDomain(host: string) {
  const response = await timedFetch(`https://rdap.org/domain/${encodeURIComponent(host)}`, { headers: { accept: "application/rdap+json, application/json" } });
  if (response.status === 404) throw new Error("No RDAP registration record was found for this domain.");
  if (!response.ok) throw new Error("The registry’s RDAP service is temporarily unavailable.");
  const data = await response.json() as { handle?: string; ldhName?: string; status?: string[]; nameservers?: Array<{ ldhName?: string }>; events?: Array<{ eventAction?: string; eventDate?: string }>; entities?: Array<{ roles?: string[]; vcardArray?: [string, Array<Array<unknown>>] }> };
  const eventRows = (data.events ?? []).map((event) => ({ label: (event.eventAction ?? "event").replaceAll("_", " "), value: event.eventDate ? new Date(event.eventDate).toLocaleString("en-US", { dateStyle: "medium", timeZone: "UTC" }) : "Unknown" }));
  const registrar = data.entities?.find((entity) => entity.roles?.includes("registrar"));
  const card = registrar?.vcardArray?.[1];
  const registrarName = card?.find((entry) => entry[0] === "fn")?.[3];
  return { ok: true, title: data.ldhName ?? host, summary: "Registration details returned by the domain’s authoritative RDAP service.", facts: [{ label: "Registry handle", value: data.handle ?? "Not published" }, { label: "Registrar", value: typeof registrarName === "string" ? registrarName : "Not published" }, { label: "Status flags", value: data.status?.join(", ") || "None published" }], sections: [{ title: "Timeline", rows: eventRows }, { title: "Nameservers", rows: (data.nameservers ?? []).map((server) => ({ value: server.ldhName ?? "Unknown" })) }] };
}

async function resolveIp(target: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(target) || target.includes(":")) return target;
  const data = await dnsQuery(cleanHost(target), "A");
  const ip = data.Answer?.find((record) => record.type === 1)?.data;
  if (!ip) throw new Error("That hostname did not resolve to a public IPv4 address.");
  return ip;
}

async function inspectIp(target: string) {
  const ip = await resolveIp(target);
  if (PRIVATE_V4.test(ip) || ip === "::1") throw new Error("Private and local IP addresses are not supported.");
  const response = await timedFetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!response.ok) throw new Error("The IP intelligence provider is temporarily unavailable.");
  const data = await response.json() as { success?: boolean; ip?: string; type?: string; continent?: string; country?: string; region?: string; city?: string; latitude?: number; longitude?: number; connection?: { asn?: number; org?: string; isp?: string; domain?: string }; timezone?: { id?: string; utc?: string } };
  if (data.success === false) throw new Error("No public network information was found for that address.");
  return { ok: true, title: data.ip ?? ip, summary: "Approximate public routing and geolocation context. This does not identify a person or precise location.", facts: [{ label: "Address type", value: data.type ?? "Unknown" }, { label: "Network", value: [data.connection?.org, data.connection?.isp].filter(Boolean).join(" · ") || "Not published" }, { label: "ASN", value: data.connection?.asn ? `AS${data.connection.asn}` : "Not published" }, { label: "Region", value: [data.city, data.region, data.country].filter(Boolean).join(", ") || "Not published" }], sections: [{ title: "Additional context", rows: [{ label: "Continent", value: data.continent ?? "Unknown" }, { label: "Coordinates", value: data.latitude != null ? `${data.latitude.toFixed(2)}, ${data.longitude?.toFixed(2)}` : "Not published" }, { label: "Timezone", value: [data.timezone?.id, data.timezone?.utc].filter(Boolean).join(" · ") || "Unknown" }, { label: "Network domain", value: data.connection?.domain ?? "Not published" }] }] };
}

async function inspectTls(host: string) {
  let reachable = false; let responseStatus = "No HTTPS response";
  try { const response = await timedFetch(`https://${host}`, { method: "HEAD", redirect: "manual" }, 6500); reachable = true; responseStatus = `${response.status} ${response.statusText}`.trim(); } catch { /* transparency results can still be useful */ }
  const response = await timedFetch(`https://crt.sh/?q=${encodeURIComponent(host)}&output=json`, { headers: { accept: "application/json" } }, 12000);
  const records = response.ok ? await response.json() as Array<{ issuer_name?: string; common_name?: string; name_value?: string; not_before?: string; not_after?: string; serial_number?: string }> : [];
  const unique = [...new Map(records.map((record) => [record.serial_number ?? `${record.common_name}-${record.not_after}`, record])).values()].sort((a,b) => Date.parse(b.not_before ?? "0") - Date.parse(a.not_before ?? "0")).slice(0,8);
  return { ok: true, title: host, summary: reachable ? "The host responded over HTTPS. Public certificate history is shown below." : "No direct HTTPS response was received, but public certificate history may still exist.", facts: [{ label: "HTTPS response", value: responseStatus }, { label: "Transparency entries", value: `${unique.length} recent unique certificates shown` }, { label: "Direct reachability", value: reachable ? "Reachable" : "Not confirmed" }], sections: [{ title: "Recent certificates", rows: unique.map((record) => ({ label: record.common_name ?? "Certificate", value: `${record.not_before ? new Date(record.not_before).toLocaleDateString("en-US", { timeZone: "UTC" }) : "Unknown"} → ${record.not_after ? new Date(record.not_after).toLocaleDateString("en-US", { timeZone: "UTC" }) : "Unknown"} · ${(record.issuer_name ?? "Unknown issuer").replace(/.*O=([^,]+).*/, "$1")}` })) }] };
}

async function ensurePublicHost(host: string) {
  const query = await dnsQuery(host, "A");
  const ips = (query.Answer ?? []).filter((item) => item.type === 1).map((item) => item.data);
  if (!ips.length || ips.some((ip) => PRIVATE_V4.test(ip))) throw new Error("The destination must resolve only to public internet addresses.");
}

async function inspectHttp(input: string) {
  const url = cleanUrl(input); await ensurePublicHost(url.hostname);
  let response = await timedFetch(url.toString(), { method: "HEAD", redirect: "manual", headers: { "user-agent": "CipherScope/1.0 security-header-check" } });
  if (response.status === 405) response = await timedFetch(url.toString(), { method: "GET", redirect: "manual", headers: { "user-agent": "CipherScope/1.0 security-header-check", range: "bytes=0-0" } });
  const checks = [{ key: "strict-transport-security", label: "HSTS" }, { key: "content-security-policy", label: "Content Security Policy" }, { key: "x-content-type-options", label: "MIME sniffing protection" }, { key: "referrer-policy", label: "Referrer policy" }, { key: "permissions-policy", label: "Permissions policy" }, { key: "cross-origin-opener-policy", label: "Cross-origin opener policy" }];
  const present = checks.filter((check) => response.headers.has(check.key)).length;
  return { ok: true, title: url.toString(), summary: `${present} of ${checks.length} recommended browser security headers were present on the first response.`, facts: [{ label: "Status", value: `${response.status} ${response.statusText}`.trim() }, { label: "Score", value: `${Math.round(present / checks.length * 100)}%` }, { label: "Redirect target", value: response.headers.get("location") ?? "No redirect on first response" }], sections: [{ title: "Security headers", rows: checks.map((check) => ({ label: check.label, value: response.headers.get(check.key) ?? "Not present", tone: response.headers.has(check.key) ? "present" : "missing" })) }, { title: "Response details", rows: ["server","content-type","cache-control","vary"].map((key) => ({ label: key, value: response.headers.get(key) ?? "Not published" })) }] };
}

async function inspectEmail(host: string) {
  const [mx, txt, dmarc, ...dkim] = await Promise.all([dnsQuery(host,"MX"), dnsQuery(host,"TXT"), dnsQuery(`_dmarc.${host}`,"TXT"), ...["default","google","selector1","selector2","k1"].map((selector) => dnsQuery(`${selector}._domainkey.${host}`,"TXT").then((data) => ({ selector, data })))]);
  const txtValues = (txt.Answer ?? []).map((item) => item.data.replace(/^"|"$/g,""));
  const spf = txtValues.find((value) => value.toLowerCase().startsWith("v=spf1"));
  const dmarcValue = dmarc.Answer?.map((item) => item.data.replace(/^"|"$/g,"" )).find((value) => value.toLowerCase().startsWith("v=dmarc1"));
  const foundDkim = dkim.filter((item) => item.data.Answer?.length);
  const score = [!!mx.Answer?.length, !!spf, !!dmarcValue, !!foundDkim.length].filter(Boolean).length;
  return { ok: true, title: host, summary: `${score} of 4 core public email signals were detected. DKIM results cover common selectors only.`, facts: [{ label: "Mail exchangers", value: mx.Answer?.length ? `${mx.Answer.length} published` : "None found" }, { label: "SPF", value: spf ? "Published" : "Not found" }, { label: "DMARC", value: dmarcValue ? (dmarcValue.match(/\bp=([^;]+)/i)?.[1]?.toUpperCase() ?? "Published") : "Not found" }, { label: "Common DKIM selectors", value: foundDkim.length ? foundDkim.map((item) => item.selector).join(", ") : "None found" }], sections: [{ title: "MX routing", rows: dnsRows(mx.Answer) }, { title: "Policy records", rows: [{ label: "SPF", value: spf ?? "Not present", tone: spf ? "present" : "missing" }, { label: "DMARC", value: dmarcValue ?? "Not present", tone: dmarcValue ? "present" : "missing" }] }, { title: "DKIM selectors detected", rows: foundDkim.map((item) => ({ label: item.selector, value: item.data.Answer?.[0]?.data.replace(/^"|"$/g,"") ?? "Published" })) }] };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tool = params.get("tool"); const target = params.get("target") ?? "";
  try {
    if (tool === "http") return json(await inspectHttp(target));
    if (tool === "ip") return json(await inspectIp(target.trim().toLowerCase()));
    const host = cleanHost(target);
    if (tool === "dns") return json(await inspectDns(host, params.get("recordType") ?? "ALL"));
    if (tool === "domain") return json(await inspectDomain(host));
    if (tool === "tls") return json(await inspectTls(host));
    if (tool === "email") return json(await inspectEmail(host));
    return json({ ok: false, error: "Choose a supported diagnostic tool." }, 400);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "The public service took too long to respond. Try again in a moment." : error instanceof Error ? error.message : "The check could not be completed.";
    return json({ ok: false, error: message }, 400);
  }
}
