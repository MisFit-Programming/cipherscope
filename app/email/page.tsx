import type { Metadata } from "next";
import CipherScopeApp from "../components/CipherScopeApp";

export const metadata: Metadata = { title: "Email Diagnostics" };
export default function Page() { return <CipherScopeApp initialTool="email" />; }
