# Security Policy

## Supported versions

Only the latest release receives fixes. Please upgrade before reporting.

| Version | Supported |
| --- | --- |
| 1.1.x | ✅ |
| < 1.1 | ❌ |

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it through GitHub's private vulnerability reporting: go to the
[Security tab](https://github.com/silham/WhatsApp-Web-AI-Assistant/security/advisories/new)
and open a draft advisory. That keeps the report private until a fix ships.

Please include:

- What an attacker can do, and what access they need to do it.
- Steps to reproduce, with your Chrome and extension versions.
- Any proof-of-concept — **with real conversation content redacted**.

You can expect an acknowledgement within 7 days and, for a confirmed issue, an
assessment of severity and a rough timeline. Credit in the advisory and the
changelog is offered unless you would rather stay anonymous.

## What is in scope

- Leaking the user's Gemini API key.
- Leaking conversation contents to any party other than the Gemini endpoint
  the user explicitly invoked.
- Code injection into the WhatsApp Web page, or privilege escalation out of the
  content script's isolated world.
- Anything that causes the extension to act on a chat without user intent.

## What is out of scope

- Vulnerabilities in WhatsApp Web itself — report those to Meta.
- Vulnerabilities in the Google Gemini API — report those to Google.
- The inherent risk of sending conversation text to Gemini when the user asks
  for a generated reply. That is the extension's purpose and is documented.
- Anything requiring an already-compromised browser profile or physical access
  to an unlocked machine.

## What this extension does with your data

For context when assessing a report:

- Messages are scraped from the DOM of the tab you are viewing and cached in
  `chrome.storage.local`, per chat, on your machine.
- Your Gemini API key is held in `chrome.storage.sync`.
- Conversation text leaves the browser only when you explicitly ask for an AI
  response, and only to `generativelanguage.googleapis.com`.
- Exported conversations are written to your downloads folder as plain text.
  They contain everything in the chat — treat those files as sensitive.
- The extension has no server. There is no telemetry and no analytics.
