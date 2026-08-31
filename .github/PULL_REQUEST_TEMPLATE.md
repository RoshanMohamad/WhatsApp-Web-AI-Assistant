## What does this change?

<!-- A short description, and the issue it closes if there is one. -->

Closes #

## Why?

<!-- The problem this solves. -->

## How was it tested?

- [ ] `npm run verify` passes locally
- [ ] Loaded unpacked in Chrome and exercised the change on WhatsApp Web

<!--
CI cannot run WhatsApp Web, so manual testing is the only signal for anything
touching content.js. Say what you actually clicked through.
-->

## Checklist

- [ ] No real conversation content, phone numbers or API keys appear in the diff
- [ ] `CHANGELOG.md` updated under *Unreleased*
- [ ] New pure logic went into `lib/` with tests, or there was none to add
- [ ] New `lib/` files are listed in both `manifest.json` and `background.js`
