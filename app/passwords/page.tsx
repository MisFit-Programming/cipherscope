import type { Metadata } from "next";
import CipherScopeApp from "../components/CipherScopeApp";

export const metadata: Metadata = { title: "Password Studio" };
export default function Page() { return <CipherScopeApp initialTool="passwords" />; }
