# Security Policy

## Supported versions

Only the latest released version of minidb receives security updates. Please
keep your dependency up to date.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a vulnerability

If you discover a security vulnerability in minidb, please report it privately
through [GitHub Security Advisories](https://github.com/neluca/minidb/security/advisories/new).
Do **not** open a public issue or discussion for security-sensitive bugs.

Please include as much detail as possible, such as:

- A description of the vulnerability.
- Steps to reproduce.
- The impact or potential exploit scenario.
- Suggested mitigation or fix (if any).

We aim to acknowledge reports within 5 business days and will coordinate a fix
and disclosure timeline with you.

## Security considerations

- minidb is an **embedded, single-process** database intended for local or
  trusted environments. The optional RESP server does not include authentication
  or transport encryption by default.
- Avoid exposing the RESP server to untrusted networks without an authenticating
  reverse proxy or tunnel.
- File permissions on the database directory are the responsibility of the host
  operating system.
