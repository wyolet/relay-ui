# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub
issues, discussions, or pull requests.**

Instead, use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** under "Private vulnerability reporting".
3. Provide a description, reproduction steps, affected versions, and
   impact assessment.

We will acknowledge receipt within a few business days and keep you
informed as we work on a fix.

## Scope

relay-ui is the operator admin UI for [Wyolet Relay](https://github.com/wyolet/relay).
It runs in the operator's browser and talks to the Relay control plane. Reports
we're especially interested in:

- Cross-site scripting (XSS) or other injection in any view that renders
  catalog, policy, key, or usage data.
- Leakage of credentials or secrets into logs, error messages, the DOM, or
  the bundled assets.
- Auth/session handling flaws in how the UI calls the control plane.
- Supply-chain risks in the dependency tree.

Vulnerabilities in the Relay **backend** (API, routing, credential handling,
the data plane) belong on the [wyolet/relay](https://github.com/wyolet/relay/security)
repository instead.

## Supported versions

Until a stable release line is established, security fixes are applied to
the `main` branch. Pin to a tagged release and watch the repository for
advisories.

## Disclosure

We follow coordinated disclosure: we'll work with you on a fix and a
disclosure timeline, and credit you in the advisory unless you prefer to
remain anonymous.
