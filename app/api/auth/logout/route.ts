import { cookies } from "next/headers";
export async function GET(request:Request){ (await cookies()).delete("cs_session"); return Response.redirect(new URL("/",request.url)); }
