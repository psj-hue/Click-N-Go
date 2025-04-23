# Security Policy for Click-N-Go

The security of Click-N-Go is important to us. We appreciate the efforts of security researchers and the community in helping keep our project safe. This document outlines our security policy, including which versions are supported and how to report vulnerabilities.

## Supported Versions

We provide security updates for specific versions of Click-N-Go. Please ensure you are using a supported version to receive security patches.

<!--
IMPORTANT FOR psj-hue: Please update this table accurately!
The versions below (e.g., 1.0.x) are **EXAMPLES ONLY**.
List your actual released versions and define your support commitment (status, level, EOL date) for each.
-->

| Version        | Status                     | Support Level         | Estimated End-of-Life (EOL) |
| -------------- | -------------------------- | --------------------- | --------------------------- |
| 1.0.x          | :white_check_mark: Supported | Full Support          | TBD                         |
| < 1.0          | :x: End-of-Life (EOL)      | None                  | Prior to January 1, 2025    |
| *Future Major* | :grey_question: Planned    | TBD                   | TBD                         |

**Support Levels:**

*   **Full Support:** Actively maintained, receives bug fixes and security patches.
*   **Security Patches Only:** (If applicable) No new features or regular bug fixes, but receives critical security updates.
*   **None:** Version is no longer supported. Users are strongly encouraged to upgrade.

*Note: End-of-Life (EOL) dates are estimates and subject to change. TBD (To Be Determined) means an EOL date has not yet been set.*

---

## Reporting a Vulnerability

We take all security reports seriously. If you believe you have found a security vulnerability in Click-N-Go, please report it to us privately.

**Please do NOT report security vulnerabilities through public GitHub issues, discussions, or other public channels.**

Instead, please use one of the following private methods:

1.  **(Preferred) GitHub Private Vulnerability Reporting:** Use GitHub's built-in private reporting feature for this repository:
    **[Report a vulnerability via GitHub](https://github.com/psj-hue/Click-N-Go/security/advisories/new)**
    This is the most secure and direct way to notify us.

2.  **(Alternative) Email:** Send an email to our private security address: `security@click-n-go.example.com`
    *   **Note for psj-hue:** You MUST create and monitor this email address if you want to offer this option. Replace the placeholder address if you use a different one, or remove this option if you only want to use GitHub reporting.

**What to Include in Your Report:**

To help us investigate and resolve the issue quickly, please include as much of the following information as possible:

*   The version(s) of Click-N-Go affected (if known).
*   A detailed description of the vulnerability.
*   Steps to reproduce the vulnerability (include code snippets, configuration, or proof-of-concept if possible).
*   The potential impact of the vulnerability (e.g., unexpected behaviour, data exposure).
*   Any known mitigation or workarounds.
*   Your contact information (if reporting via email and wish to be contacted, or if using GitHub reporting under a masked address).

**What to Expect After Reporting:**

1.  **Acknowledgement:** We aim to acknowledge receipt of your report within **2 business days**. (Note for psj-hue: adjust if needed)
2.  **Initial Triage:** We will investigate the report to validate the vulnerability. We aim to provide an initial assessment within **5 business days** of acknowledgment. (Note for psj-hue: adjust if needed)
3.  **Updates:** We will strive to keep you informed of our progress via the reporting channel (GitHub Advisory or email). The timeline for a fix depends on the complexity and severity.
4.  **Resolution & Disclosure:** Once a fix is developed and tested, we will coordinate the release and public disclosure (typically through a GitHub Security Advisory).
5.  **Acknowledgements:** We value the contributions of security researchers. If you agree, we would like to publicly credit you for your discovery in the advisory or release notes. Please let us know your preference for acknowledgement (e.g., name, link, or anonymous).

---

## Scope

This security policy applies to the main codebase of the Click-N-Go project located in the `psj-hue/Click-N-Go` repository. Vulnerabilities in third-party libraries should be reported to their respective maintainers, unless the vulnerability stems directly from how Click-N-Go uses that library.

---

Thank you for helping keep Click-N-Go secure.
