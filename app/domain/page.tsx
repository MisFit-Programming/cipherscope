import type { Metadata } from "next";
import CipherScopeApp from "../components/CipherScopeApp";

export const metadata: Metadata = { title: "Domain Health" };
export default function Page() { return <CipherScopeApp initialTool="domain" />; }
