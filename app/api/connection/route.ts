type CfData={country?:string;city?:string;region?:string;timezone?:string;colo?:string;asn?:number;asOrganization?:string;httpProtocol?:string;tlsVersion?:string};

function snapshot(request:Request){
  const headers=request.headers,cf=(request as Request&{cf?:CfData}).cf||{};
  const ip=headers.get("cf-connecting-ip")||headers.get("x-real-ip")||headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"Unavailable";
  return{ip,ipVersion:ip.includes(":")?"IPv6":ip.includes(".")?"IPv4":"Unknown",userAgent:headers.get("user-agent")||"Not sent",language:headers.get("accept-language")||"",method:request.method,encoding:headers.get("accept-encoding")||"",mime:headers.get("accept")||"",forwarded:headers.get("x-forwarded-for")||"",country:cf.country||headers.get("cf-ipcountry")||"",city:cf.city||"",region:cf.region||"",timezone:cf.timezone||"",colo:cf.colo||"",asn:cf.asn?`AS${cf.asn}`:"",organization:cf.asOrganization||"",protocol:cf.httpProtocol||headers.get("x-forwarded-proto")||"",tls:cf.tlsVersion||"",ray:headers.get("cf-ray")||"",checkedAt:new Date().toISOString()};
}

export async function GET(request:Request){const data=snapshot(request),url=new URL(request.url),field=url.searchParams.get("field");const fields:Record<string,string>={ip:data.ip,ua:data.userAgent,country:data.country};if(field&&field in fields)return new Response(fields[field],{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});return Response.json(data,{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});}
