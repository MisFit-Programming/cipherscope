import type { Metadata } from "next";
import CipherScopeApp from "../components/CipherScopeApp";

export const metadata: Metadata = { title: "DNS Explorer" };
export default function Page() { return <CipherScopeApp initialTool="dns" />; }
