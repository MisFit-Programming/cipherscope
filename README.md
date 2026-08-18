# CipherScope

CipherScope is a privacy-first security workbench published entirely with GitHub Pages.

**Website:** https://misfit-programming.github.io/cipherscope/

## Browser-based tools

- Cryptographically random password generator with entropy estimates
- Memorable passphrase builder
- Public DNS record explorer for A, AAAA, CNAME, MX, TXT, NS, and CAA
- Integrated SuperTool command router for DNS, email, reputation, website, and network diagnostics
- Domain-health report for MX, SPF, DMARC, MTA-STS, TLS reporting, CAA, and authoritative DNS
- Local domain normalization with authoritative RDAP links
- Offline IPv4/CIDR subnet calculator
- Public-IP and local browser connection summary with multiple lookup providers
- Offline TLS certificate-expiry and renewal calculator
- Offline HTTP security-header analyzer
- MX, SPF, and DMARC checks through public DNS-over-HTTPS
- Offline delivered-email header analyzer
- Offline SPF and DMARC policy builders

There is no application backend, account system, database, or deployment secret. Generated credentials and pasted values stay in the browser. DNS and email checks try Google Public DNS and Cloudflare DNS over HTTPS; public-IP checks try ipify and ifconfig.me. When a browser or network blocks those services, CipherScope offers direct external diagnostic links instead of attempting to bypass the restriction. SMTP, ICMP, TCP, blacklist, and active server checks require a remote diagnostic provider and are handed off to MXToolbox with the target prefilled.

## Run locally

Serve the repository with any static web server. For example:

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.

## Validate

```bash
node --check app.js
node --test tests/static-site.test.mjs
```

## Deployment

The GitHub Actions workflow verifies the static files and deploys them to GitHub Pages whenever `main` changes.
