# Security policy · Política de seguridad

Vitruvius Digital Library is an independent, open-access scholarly resource published primarily on GitHub Pages. Its public source code is available for inspection. The use of GitHub Pages and HTTPS does **not** replace an independent security assessment or imply institutional certification.

## Reporting a vulnerability · Comunicación responsable

**Please do not publish exploit instructions, sensitive data, or live credentials in a public issue.**

If GitHub private vulnerability reporting is available, use the repository's **Security → Report a vulnerability** facility. Otherwise, first contact the repository maintainer privately via their GitHub profile to arrange a confidential report. For ordinary, non-sensitive technical defects, use the repository's public Issues area.

Please provide a concise description, affected page or component, reproduction steps, and potential impact. Avoid including personal information or credentials. Security reports should be distinguished from scholarly corrections or requests for new features.

## Scope and risks

- The main publication is a browser-accessible static website. Some tools link to third-party manuscripts, bibliographic repositories, search providers, APIs or embedded content. Those providers have separate security and privacy practices.
- The repository is public. **No API keys, passwords, private tokens, or private manuscripts should ever be committed to it or delivered to visitors' browsers.** GitHub Actions secrets must never appear in generated static files, logs or public artifacts.
- The manuscript and folio protections in `.github/workflows/protect-library-assets.yml` and `scripts/guard-library-assets.mjs` are intended to prevent destructive updates. Their presence is not a substitute for account protection or branch protection.
- Contributions should receive a review of permissions, external dependencies, links, browser-side input handling, and effects on scholarly source attribution before being merged.
- Sources, manuscript shelfmarks, editorial status and copyright/licence information should be verifiable and must not imply endorsement by custodial institutions.

## For maintainers · Para responsables

1. Use a strong password and multifactor authentication or a passkey for the GitHub account.
2. Restrict the default branch against force pushes and deletion; enable review and reliable checks when available. **Do not make unstable CI checks mandatory until repaired.**
3. Give GitHub Actions the minimum necessary `GITHUB_TOKEN` permissions. Prefer read-only checks, and manually reviewed pull requests for publishing generated material.
4. Enable GitHub's dependency graph, Dependabot alerts, secret scanning with push protection, and code scanning as available for public repositories.
5. Update dependencies and third-party actions regularly, and pin workflow actions to a verified full commit SHA when practicable.
6. Keep scholarly folios, codices and master editions intact; fix tests or permissions rather than disabling the preservation guard.
7. Review any security-alert findings before publicly disclosing details. Never include secret values in incident reports.

## Español

La biblioteca es una iniciativa académica independiente. La publicación mediante GitHub Pages y HTTPS ayuda a la transparencia, pero **no constituye una certificación de seguridad ni un aval institucional**. Los problemas de seguridad deben comunicarse de forma privada, nunca publicando claves o instrucciones de explotación en Issues. Los códices, folios y ediciones originales deben preservarse y sus controles de integridad no deben desactivarse.

Public issue tracker (non-sensitive reports): https://github.com/diegoalonsok-png/vitruvius-digital-library/issues

Last reviewed: 2026-11-10.
