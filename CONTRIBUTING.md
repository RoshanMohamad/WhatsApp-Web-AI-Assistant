# Contributing

Thanks for taking the time to contribute. This is a small Chrome extension, so
the process is deliberately light.

## Ground rules

- Be respectful. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Never include real conversation data** in an issue, a pull request or a
  test fixture. Exports contain private messages, phone numbers and sometimes
  one-time passcodes. Redact anything you paste, and invent fixture data.
- Never commit an API key. `.gitignore` covers the usual suspects, but the
  extension stores your Gemini key in Chrome sync storage, so it should never
  reach a file in the first place.

## Getting set up

```bash
git clone https://github.com/silham/WhatsApp-Web-AI-Assistant.git
cd WhatsApp-Web-AI-Assistant
npm install          # ESLint only; the extension itself has no dependencies
```

Load the extension in Chrome:

1. Open `chrome://extensions/`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Open <https://web.whatsapp.com> and look for the floating AI button.

After changing any file, press the reload icon on the extension card in
`chrome://extensions/`, then refresh the WhatsApp Web tab. Content scripts are
not hot-reloaded.

## Before you open a pull request

```bash
npm run verify       # lint + manifest check + tests
```

Individually:

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint across the extension, scripts and tests |
| `npm run lint:fix` | The same, applying the fixes it can |
| `npm run check:manifest` | Confirms `manifest.json` is valid, its version matches `package.json`, and every file it references exists |
| `npm test` | Node's built-in test runner over `test/` |
| `npm run package` | Verifies, then builds `dist/*.zip` for the Chrome Web Store |

CI runs the same commands on every pull request, so a green `npm run verify`
locally means a green build.

## Where code goes

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension configuration (Manifest V3) |
| `content.js` | Everything that runs inside WhatsApp Web: DOM scraping, the message cache, the UI, the Gemini call |
| `lib/` | Dependency-free logic that can be unit tested in Node |
| `background.js` | Service worker; injects the content script on navigation |
| `popup.js` / `popup.html` | Toolbar popup |
| `styles.css` | Styling for the injected UI |
| `test/` | Tests for `lib/`, run with `node --test` |
| `scripts/` | Repository tooling (manifest check, packaging) |

**Put testable logic in `lib/`.** `content.js` needs a live WhatsApp DOM and
the `chrome.*` APIs, so it cannot be unit tested; anything pure — parsing,
sorting, formatting — belongs in `lib/` where it can be. Files in `lib/` attach
their API to `globalThis` and also export it via CommonJS, so the same file
serves the extension and the tests. Add new `lib/` files to the
`content_scripts.js` array in `manifest.json` **and** to the injection list in
`background.js`, in load order.

## Changing WhatsApp DOM selectors

WhatsApp Web ships unannounced markup changes, and they are the most common
cause of breakage. When a selector stops matching:

- Keep the existing selector as a fallback rather than replacing it outright —
  users on an older rollout may still need it.
- Say which WhatsApp build you observed the change on in your pull request.

## Commit messages and pull requests

- Write commit subjects in the imperative: "Fix export ordering", not "Fixed"
  or "Fixes".
- Keep one logical change per pull request.
- In the description, say what you tested manually — for anything touching the
  content script, "loaded unpacked and exercised it on a real chat" is the
  minimum, since CI cannot run WhatsApp Web.

## Releasing

Maintainers only:

1. Update `CHANGELOG.md`, moving entries out of *Unreleased*.
2. Bump the version in **both** `package.json` and `manifest.json`
   (`npm run check:manifest` enforces that they match).
3. Commit, then tag: `git tag v1.2.0 && git push origin main --tags`.
4. The release workflow builds the zip and attaches it to a GitHub release.
5. Upload that zip to the Chrome Web Store dashboard if publishing there.
