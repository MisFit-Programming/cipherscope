import { cookies } from "next/headers";

export type SessionUser = { sub: string; email: string; name?: string; role: "member" | "admin"; exp: number };

function base64url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = ""; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decode(value:string) { const padded=value.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((value.length+3)%4); return atob(padded); }
async function hmac(value:string,secret:string){ const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]); return base64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)))); }
export function randomToken(bytes=32){ const value=new Uint8Array(bytes); crypto.getRandomValues(value); return base64url(value); }
export async function sha256(value:string){ return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))); }
export function authConfig(){ return { domain:(process.env.AUTH0_DOMAIN||"").replace(/^https?:\/\//,"").replace(/\/$/,""), clientId:process.env.AUTH0_CLIENT_ID||"", clientSecret:process.env.AUTH0_CLIENT_SECRET||"", sessionSecret:process.env.SESSION_SECRET||"", adminEmails:(process.env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean), allowedEmails:(process.env.APPROVED_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean), allowedDomains:(process.env.APPROVED_DOMAINS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean) }; }
export function configured(){ const c=authConfig(); return Boolean(c.domain&&c.clientId&&c.clientSecret&&c.sessionSecret); }
export function isAllowed(email:string){ const c=authConfig(); const normalized=email.toLowerCase(); const domain=normalized.split("@")[1]||""; return c.adminEmails.includes(normalized)||c.allowedEmails.includes(normalized)||c.allowedDomains.includes(domain); }
export function roleFor(email:string):"member"|"admin"{ return authConfig().adminEmails.includes(email.toLowerCase())?"admin":"member"; }
export async function encodeSession(user:SessionUser){ const payload=base64url(JSON.stringify(user)); return `${payload}.${await hmac(payload,authConfig().sessionSecret)}`; }
export async function readSession(){ const value=(await cookies()).get("cs_session")?.value; if(!value)return null; const [payload,signature]=value.split("."); if(!payload||!signature||await hmac(payload,authConfig().sessionSecret)!==signature)return null; try{ const user=JSON.parse(decode(payload)) as SessionUser; return user.exp>Date.now()/1000?user:null; }catch{return null;} }
