import { cookies } from "next/headers";
import { authConfig, configured, randomToken, sha256 } from "../../../lib/auth";

export async function GET(request:Request){
  if(!configured()) return Response.redirect(new URL("/signin?state=configuration",request.url));
  const config=authConfig(); const state=randomToken(); const nonce=randomToken(); const verifier=randomToken(48); const challenge=await sha256(verifier); const cookie=await cookies(); const secure=new URL(request.url).protocol==="https:";
  for(const [name,value] of [["cs_oauth_state",state],["cs_oauth_nonce",nonce],["cs_oauth_verifier",verifier]] as const) cookie.set(name,value,{httpOnly:true,secure,sameSite:"lax",maxAge:600,path:"/"});
  const callback=new URL("/api/auth/callback",request.url).toString(); const authorize=new URL(`https://${config.domain}/authorize`); authorize.search=new URLSearchParams({response_type:"code",client_id:config.clientId,redirect_uri:callback,scope:"openid profile email",state,nonce,code_challenge:challenge,code_challenge_method:"S256"}).toString(); return Response.redirect(authorize);
}
