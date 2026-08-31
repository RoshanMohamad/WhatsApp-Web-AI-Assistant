# WhatsApp Web AI Assistant

[![CI](https://github.com/silham/WhatsApp-Web-AI-Assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/silham/WhatsApp-Web-AI-Assistant/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4.svg)](manifest.json)

A Chrome extension that enables you to export WhatsApp Web conversations and generate AI responses using Google's Gemini AI.

It runs entirely in your own browser: there is no server, no telemetry, and
conversation text leaves your machine only when you explicitly ask for an AI
response. You bring your own Gemini API key.

> **Not affiliated with WhatsApp or Meta.** See [Disclaimer](#disclaimer).

## Features

- 📤 **Export Conversations**: Extract and download complete WhatsApp conversations as text files
- 🤖 **AI Response Generation**: Generate contextually appropriate responses using Google's Gemini AI
- ⚙️ **Custom System Instructions**: Personalize AI behavior with custom instructions and presets
- ✨ **Smart Integration**: Insert AI-generated responses directly into WhatsApp's message input
- 📋 **Copy to Clipboard**: Easily copy generated responses for use elsewhere
- 🔒 **Privacy-Focused**: All processing happens locally in your browser

## Installation

1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in the top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key (free tier available)

2. **Configure the Extension**:
   - Open [WhatsApp Web](https://web.whatsapp.com)
   - Look for the green floating AI button (bottom-right corner)
   - Click the button and select "Settings"
   - Enter your Gemini API key and save
   - Optionally customize the system instructions to personalize AI responses

## Usage

### Exporting Conversations

1. Open any WhatsApp conversation
2. Click the floating AI button
3. Select "Export Conversation"
4. The conversation will be downloaded as a text file

### Generating AI Responses

1. Make sure your API key is configured
2. Open any WhatsApp conversation
3. Click the floating AI button
4. Select "Generate AI Response"
5. Wait for the AI to analyze and generate a response
6. Choose to copy or insert the response directly into the chat

### Customizing AI Behavior

1. Click the AI button and go to Settings
2. In the "System Instructions" field, enter custom instructions such as:
   - "Always respond in a professional manner"
   - "Keep responses brief and to the point"  
   - "Act as a customer support agent"
   - "Respond in Spanish with enthusiasm"
3. Use preset buttons for common instruction templates
4. Save your settings

The AI will use these instructions to tailor its responses to your needs.

## How It Works

The extension uses advanced DOM selectors to extract messages from WhatsApp Web:

- **Incoming messages**: Detected using `.message-in` class
- **Outgoing messages**: Detected using `.message-out` class
- **Message content**: Extracted from `.selectable-text` elements
- **Timestamps**: Retrieved from message metadata
- **Group chat senders**: Identified from message attributes

The conversation is then formatted and sent to Google's Gemini AI API to generate contextually appropriate responses.

## Technical Details

### Message Detection
```javascript
// Incoming messages (like your HTML example)
document.querySelectorAll('.message-in')

// Outgoing messages
document.querySelectorAll('.message-out')

// Message containers
document.querySelectorAll('[data-testid="msg-container"]')
```

### AI Integration
- **Model**: `gemini-2.0-flash` (chosen for fast responses)
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 1024
- **Context**: up to the 100 most recent messages

### Supported Features
- ✅ Text messages
- ✅ Group chats
- ✅ Individual chats
- ✅ Message timestamps
- ✅ Sender identification
- ⚠️ Media messages (Will be available soon)

## Privacy & Security

- All message processing happens locally in your browser
- API key is stored securely in Chrome's sync storage
- Conversations are only sent to Gemini when you explicitly request AI responses
- No data is stored on external servers (except during API calls)
- Extension only works on `web.whatsapp.com` for security

## File Structure

```
WhatsApp-Web-AI-Assistant/
├── manifest.json          # Extension configuration (Manifest V3)
├── content.js             # WhatsApp integration: DOM scraping, cache, UI, Gemini calls
├── background.js          # Service worker; injects the content script
├── popup.html/.js         # Toolbar popup
├── help.html              # In-extension documentation page
├── styles.css             # Styling for the injected UI
├── lib/
│   └── timestamps.js      # Dependency-free timestamp parsing and message ordering
├── test/                  # Unit tests for lib/, run with `node --test`
├── scripts/
│   ├── check-manifest.js  # Validates manifest.json before packaging
│   └── package.js         # Builds the Chrome Web Store zip into dist/
└── .github/workflows/     # CI and release automation
```

Anything that can be tested without a browser lives in `lib/`. Files there
attach their API to `globalThis` for the extension and export it via CommonJS
for the tests, so a single file serves both.

## Development

### Prerequisites
- Chrome browser
- [Node.js](https://nodejs.org) 20.11 or newer (for linting, tests and packaging)
- Gemini API key

### Local Development
```bash
git clone https://github.com/silham/WhatsApp-Web-AI-Assistant.git
cd WhatsApp-Web-AI-Assistant
npm install          # ESLint only; the extension itself ships no dependencies
npm run verify       # lint + manifest check + tests
```

Then load the folder in Chrome via **Load unpacked**, as in
[Installation](#installation). After editing a file, press reload on the
extension card in `chrome://extensions/` and refresh the WhatsApp Web tab —
content scripts are not hot-reloaded.

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint across the extension, scripts and tests |
| `npm test` | Unit tests for `lib/`, using Node's built-in runner |
| `npm run check:manifest` | Validates `manifest.json` and its version against `package.json` |
| `npm run verify` | All three, the same set CI runs |
| `npm run package` | Verifies, then builds `dist/*.zip` for the Chrome Web Store |

### Key Components

**content.js**: Main script that:
- Detects WhatsApp messages using CSS selectors
- Extracts conversation data
- Interfaces with Gemini AI API
- Manages UI interactions

**styles.css**: Provides styling for:
- Floating action button
- Modal dialogs
- Responsive design
- Notification system

## Troubleshooting

### Extension Not Working
- Refresh WhatsApp Web page
- Check if extension is enabled in Chrome
- Verify you're on `web.whatsapp.com`

### AI Responses Not Generating
- Verify API key is correctly entered
- Check internet connection
- Ensure you haven't exceeded API limits

### Messages Not Extracting
- Make sure conversation is fully loaded
- Scroll up to load older messages
- Try refreshing the page

## API Rate Limits

Google's Gemini API has rate limits:
- **Free tier**: 60 requests per minute
- **Paid tier**: Higher limits available

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the
setup, the checks to run before opening a pull request, and where code should
live. Participation is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md).

**Never include real conversation content** in an issue, a pull request or a
test fixture — exports contain private messages, phone numbers and sometimes
one-time passcodes.

Changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Security

To report a vulnerability, use
[private vulnerability reporting](https://github.com/silham/WhatsApp-Web-AI-Assistant/security/advisories/new)
rather than a public issue. [SECURITY.md](SECURITY.md) sets out what is in
scope and exactly what the extension does with your data.

## License

[MIT](LICENSE) © Shakil Ilham

## Disclaimer

This extension is not affiliated with WhatsApp or Meta. It's an independent tool designed to enhance the WhatsApp Web experience through AI integration.

## Support

- [Open an issue](https://github.com/silham/WhatsApp-Web-AI-Assistant/issues/new/choose) for a bug or a feature request
- Review the [troubleshooting](#troubleshooting) section above
- Open `help.html` from the extension popup for in-app documentation
- For anything security-related, see [SECURITY.md](SECURITY.md)

---

**Note**: This extension requires a Google Gemini API key to function. Make sure to keep your API key secure and never share it publicly.
