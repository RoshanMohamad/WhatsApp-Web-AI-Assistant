'use strict';

/**
 * Runs background.js the way Chrome does - as a service worker with its
 * importScripts resolved - and drives one generation per provider against a
 * stubbed fetch.
 *
 * This is the wiring the content script depends on: it hands the worker a
 * provider id and a prompt over a message port and expects `{ok, text}` back,
 * with any failure arriving as a sentence rather than a rejected promise.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const providers = require('../lib/providers.js');

/** A service-worker global with just enough chrome.* for the file to load. */
function createWorker(fetchStub) {
  const noop = () => {};

  const sandbox = {
    console: { log: noop, warn: noop, error: noop },
    fetch: fetchStub,
    URL,
    Map,
    Set,
    chrome: {
      runtime: { onInstalled: { addListener: noop }, onMessage: { addListener: noop } },
      tabs: { onUpdated: { addListener: noop } },
      scripting: { executeScript: noop, insertCSS: noop },
      permissions: { contains: async () => true }
    }
  };

  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  // importScripts runs the named files in this same global, as a worker does.
  sandbox.importScripts = (...files) => {
    for (const file of files) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
    }
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8'), context, {
    filename: 'background.js'
  });

  return context;
}

/** Replies to whatever URL is requested with the given provider's wire format. */
function respondWith(body, init) {
  const calls = [];
  const fetchStub = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: (init && init.ok) !== false,
      status: (init && init.status) || 200,
      json: async () => body
    };
  };
  fetchStub.calls = calls;
  return fetchStub;
}

const RESPONSES = {
  gemini: { candidates: [{ content: { parts: [{ text: 'Sure thing!' }] } }] },
  anthropic: { content: [{ type: 'text', text: 'Sure thing!' }] },
  openai: { choices: [{ message: { content: 'Sure thing!' } }] }
};

function wireResponse(providerId) {
  return RESPONSES[providers.get(providerId).wireFormat] || RESPONSES.openai;
}

test('the worker returns generated text for every provider', async () => {
  for (const provider of providers.list()) {
    const fetchStub = respondWith(wireResponse(provider.id));
    const worker = createWorker(fetchStub);

    const result = await worker.generate({
      provider: provider.id,
      apiKey: 'test-key',
      baseUrl: provider.defaultBaseUrl || 'https://example.test/v1',
      systemPrompt: 'Be brief.',
      userPrompt: 'Say hello.'
    });

    assert.equal(result.ok, true, `${provider.id} failed: ${result.error}`);
    assert.equal(result.text, 'Sure thing!');
    assert.equal(fetchStub.calls.length, 1, `${provider.id} should make exactly one request`);
  }
});

test('the request body reaches the network as JSON, not as [object Object]', async () => {
  const fetchStub = respondWith(RESPONSES.openai);
  const worker = createWorker(fetchStub);

  await worker.generate({
    provider: 'openai',
    apiKey: 'test-key',
    baseUrl: 'https://api.openai.com/v1',
    systemPrompt: 'Be brief.',
    userPrompt: 'Say hello.'
  });

  const sent = JSON.parse(fetchStub.calls[0].options.body);
  assert.equal(sent.messages[1].content, 'Say hello.');
  assert.equal(fetchStub.calls[0].options.headers.Authorization, 'Bearer test-key');
});

test('an HTTP error comes back as a sentence, not a rejection', async () => {
  const worker = createWorker(respondWith({ error: { message: 'Incorrect API key' } }, { ok: false, status: 401 }));

  const result = await worker.generate({
    provider: 'openai',
    apiKey: 'wrong',
    baseUrl: 'https://api.openai.com/v1',
    userPrompt: 'Say hello.'
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /rejected the API key/);
  assert.match(result.error, /Incorrect API key/);
});

test('an unreachable host is reported as an unreachable host', async () => {
  const worker = createWorker(async () => {
    throw new TypeError('Failed to fetch');
  });

  const result = await worker.generate({
    provider: 'custom',
    apiKey: '',
    baseUrl: 'http://localhost:9999/v1',
    userPrompt: 'Say hello.'
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Could not reach localhost:9999/);
});

test('a response with no usable text is reported rather than returned empty', async () => {
  const worker = createWorker(respondWith({ choices: [{ message: {} }] }));

  const result = await worker.generate({
    provider: 'groq',
    apiKey: 'gsk_test',
    baseUrl: 'https://api.groq.com/openai/v1',
    userPrompt: 'Say hello.'
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /empty response/);
});

test('listing models goes to the provider and returns ids', async () => {
  const fetchStub = respondWith({ data: [{ id: 'gpt-4o' }] });
  const worker = createWorker(fetchStub);

  const result = await worker.listModels({
    provider: 'openai',
    apiKey: 'test-key',
    baseUrl: 'https://api.openai.com/v1'
  });

  // The worker's objects come from a vm realm, so compare fields rather than shape.
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(result.models), ['gpt-4o']);
  assert.equal(fetchStub.calls[0].url, 'https://api.openai.com/v1/models');
  assert.equal(fetchStub.calls[0].options.method, 'GET');
});
