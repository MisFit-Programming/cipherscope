# CipherScope

CipherScope is a privacy-first security workbench for generating credentials and reading practical public network signals without a cluttered, expert-only interface.

Live site: https://cipherscope-workbench.gray-protoco-6740.chatgpt.site

## Tools

- Cryptographically random password generator with entropy estimates
- Memorable passphrase builder
- DNS record explorer for A, AAAA, CNAME, MX, TXT, NS, and CAA
- Domain registration and nameserver details through RDAP
- IP ownership, routing, and approximate region context
- HTTPS reachability and certificate-transparency history
- HTTP security-header audit with public-destination safeguards
- MX, SPF, DMARC, and common DKIM-selector checks

Generated passwords and passphrases stay in the browser. Network diagnostics query public services and deliberately reject local or private-network destinations.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Validation

```bash
npm run build
node --test tests/rendered-html.test.mjs
npm run lint
```

## Stack

- React 19 and vinext
- TypeScript
- Cloudflare Workers-compatible server output
- Public DNS-over-HTTPS, RDAP, certificate-transparency, and IP context sources

## Security notes

CipherScope is intended for defensive diagnostics and everyday credential hygiene. Public network data can be incomplete or delayed, and IP geolocation is approximate. The workbench does not replace a professional security assessment.
