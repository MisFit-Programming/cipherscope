import type { Metadata } from "next";
import CipherScopeApp from "../components/CipherScopeApp";

export const metadata: Metadata = { title: "Watchlist" };
export default function Page() { return <CipherScopeApp initialTool="dashboard" />; }
