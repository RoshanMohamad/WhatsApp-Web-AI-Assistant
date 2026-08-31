# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-08-31

### Fixed

- Exported conversations are now in true chronological order. Timestamp parsing
  only understood the 24-hour, day-first format (`09:21, 19/08/2025`), so a
  browser rendering `7:04 AM, 7/31/2026` lost both the AM/PM marker and the
  date, and messages were sorted by time of day across unrelated dates. Parsing
  now handles 12- and 24-hour clocks, day-first, month-first and ISO dates,
  2-digit years and alternative separators, and works out a conversation's date
  order from the dates themselves.
- Messages sent within the same minute keep the order they appear in the chat,
  rather than the order they happened to be scrolled into the cache.
- Timestamps that cannot be parsed no longer fall back to the current time,
  which used to scatter them through the middle of an export. They keep their
  original order at the end instead.
- Removed a `web_accessible_resources` entry for `inject.js`, a file that does
  not exist in the extension.

### Added

- `lib/timestamps.js`: timestamp parsing and ordering, split out of
  `content.js` so it can be unit tested outside the browser.
- A test suite (`npm test`) covering timestamp parsing and message ordering.
- ESLint configuration and `npm run lint`.
- `npm run check:manifest`, which validates `manifest.json` and confirms every
  file it references exists and its version matches `package.json`.
- `npm run package`, which builds a Chrome Web Store zip into `dist/`.
- Continuous integration, plus a release workflow that attaches the packaged
  extension to a GitHub release when a `v*` tag is pushed.
- Project documentation: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md` and this changelog.

### Changed

- Switched the content generation endpoint to `gemini-2.0-flash`.
- `manifest.json` version is now `1.1.0` rather than `1.1`, so it can be
  compared directly against `package.json`.

## [1.1.0] - 2025-08-21

### Added

- Instructions modal for steering an individual AI response.

### Changed

- Improved conversation formatting before it is sent to the model.

## [1.0.0] - 2025-08-19

### Added

- Initial release: conversation export, Gemini-generated replies, custom system
  instructions, insert-into-chat and copy-to-clipboard.
- Larger context window, using `gemini-2.5-flash`.

[Unreleased]: https://github.com/silham/WhatsApp-Web-AI-Assistant/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/silham/WhatsApp-Web-AI-Assistant/releases/tag/v1.2.0
[1.1.0]: https://github.com/silham/WhatsApp-Web-AI-Assistant/commit/79de63a
[1.0.0]: https://github.com/silham/WhatsApp-Web-AI-Assistant/commit/0126087
