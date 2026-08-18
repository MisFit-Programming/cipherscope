import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "cipherscope.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  return {
    title: { default: "CipherScope — Global DNS and private security tools", template: "%s · CipherScope" },
    description: "Advanced private password generation, a live public-IP connection view, worldwide DNS propagation, and practical domain and email diagnostics.",
    applicationName: "CipherScope",
    metadataBase: base,
    openGraph: { title: "CipherScope", description: "Global DNS and private security tools—no account required.", type: "website", images: [{ url: new URL("/tree-logo.png", base).toString(), width: 1536, height: 1536, alt: "CipherScope circuit tree mark." }] },
    twitter: { card: "summary_large_image", title: "CipherScope", description: "Global DNS and private security tools—no account required.", images: [new URL("/tree-logo.png", base).toString()] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
