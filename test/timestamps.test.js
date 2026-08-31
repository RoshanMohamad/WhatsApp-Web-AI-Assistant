'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DAY_FIRST,
  MONTH_FIRST,
  detectDateOrder,
  parseTimestamp,
  sortMessagesChronologically
} = require('../lib/timestamps.js');

/** Format a parsed timestamp as a local-time string the assertions can read. */
function readable(time) {
  if (time === null) return null;
  const d = new Date(time);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

test('parseTimestamp: 12-hour clock with a month-first date', () => {
  assert.equal(readable(parseTimestamp('7:04 AM, 7/31/2026', MONTH_FIRST)), '2026-07-31 07:04:00');
  assert.equal(readable(parseTimestamp('3:11 PM, 8/21/2026', MONTH_FIRST)), '2026-08-21 15:11:00');
});

test('parseTimestamp: midnight and noon are not confused', () => {
  assert.equal(readable(parseTimestamp('12:59 AM, 7/29/2026', MONTH_FIRST)), '2026-07-29 00:59:00');
  assert.equal(readable(parseTimestamp('12:15 PM, 7/29/2026', MONTH_FIRST)), '2026-07-29 12:15:00');
});

test('parseTimestamp: 24-hour clock with a day-first date', () => {
  assert.equal(readable(parseTimestamp('09:21, 19/08/2025', DAY_FIRST)), '2025-08-19 09:21:00');
  assert.equal(readable(parseTimestamp('21:05, 19/08/2025', DAY_FIRST)), '2025-08-19 21:05:00');
});

test('parseTimestamp: ISO dates are read year-first whatever the date order', () => {
  assert.equal(readable(parseTimestamp('21:05, 2025-08-19', DAY_FIRST)), '2025-08-19 21:05:00');
  assert.equal(readable(parseTimestamp('21:05, 2025-08-19', MONTH_FIRST)), '2025-08-19 21:05:00');
});

test('parseTimestamp: dotted separators, punctuated meridiem and 2-digit years', () => {
  assert.equal(readable(parseTimestamp('8:30 p.m., 06.08.26', DAY_FIRST)), '2026-08-06 20:30:00');
});

test('parseTimestamp: seconds are kept when present', () => {
  assert.equal(readable(parseTimestamp('09:21:42, 19/08/2025', DAY_FIRST)), '2025-08-19 09:21:42');
});

test('parseTimestamp: an unambiguous date wins over the requested order', () => {
  // 19 cannot be a month, so this is 19 August however we were asked to read it
  assert.equal(readable(parseTimestamp('09:21, 19/08/2025', MONTH_FIRST)), '2025-08-19 09:21:00');
  // 31 cannot be a month either
  assert.equal(readable(parseTimestamp('7:04 AM, 7/31/2026', DAY_FIRST)), '2026-07-31 07:04:00');
});

test('parseTimestamp: a time with no date falls back to today', () => {
  const today = new Date();
  const parsed = new Date(parseTimestamp('14:35', DAY_FIRST));
  assert.equal(parsed.getFullYear(), today.getFullYear());
  assert.equal(parsed.getMonth(), today.getMonth());
  assert.equal(parsed.getDate(), today.getDate());
  assert.equal(parsed.getHours(), 14);
  assert.equal(parsed.getMinutes(), 35);
});

test('parseTimestamp: unusable input returns null rather than the current time', () => {
  assert.equal(parseTimestamp('no time here'), null);
  assert.equal(parseTimestamp(''), null);
  assert.equal(parseTimestamp(null), null);
  assert.equal(parseTimestamp(undefined), null);
});

test('detectDateOrder: a day above 12 marks the conversation day-first', () => {
  assert.equal(detectDateOrder([
    { timestamp: '10:00, 5/6/2025' },
    { timestamp: '09:21, 19/08/2025' }
  ]), DAY_FIRST);
});

test('detectDateOrder: a month position above 12 marks it month-first', () => {
  assert.equal(detectDateOrder([
    { timestamp: '10:00 AM, 5/6/2026' },
    { timestamp: '7:04 AM, 7/31/2026' }
  ]), MONTH_FIRST);
});

test('detectDateOrder: ISO years are not mistaken for days', () => {
  // 2025 > 12 but it is a year, so it must not force day-first on its own
  assert.equal(detectDateOrder([
    { timestamp: '10:00, 2025-08-19' },
    { timestamp: '7:04 AM, 7/31/2026' }
  ]), MONTH_FIRST);
});

test('detectDateOrder: falls back to the locale when every date is ambiguous', () => {
  const order = detectDateOrder([{ timestamp: '10:00, 5/6/2026' }]);
  assert.ok(order === DAY_FIRST || order === MONTH_FIRST);
});

test('sortMessagesChronologically: orders a scrambled export by date, not time of day', () => {
  // Regression: these used to sort as 1:00 AM, 2:27 PM, ... 12:59 AM because
  // the AM/PM marker and the date were both dropped during parsing.
  const messages = [
    { timestamp: '2:27 PM, 8/21/2026', text: 'later' },
    { timestamp: '1:00 AM, 7/29/2026', text: 'first' },
    { timestamp: '12:59 AM, 7/29/2026', text: 'earliest' },
    { timestamp: '10:32 AM, 8/6/2026', text: 'middle' }
  ];

  assert.deepEqual(
    sortMessagesChronologically(messages).map((m) => m.text),
    ['earliest', 'first', 'middle', 'later']
  );
});

test('sortMessagesChronologically: same-minute messages fall back to chat order', () => {
  const messages = [
    { timestamp: '8:29 AM, 8/11/2026', domOrder: 3, text: 'c' },
    { timestamp: '8:29 AM, 8/11/2026', domOrder: 1, text: 'a' },
    { timestamp: '8:29 AM, 8/11/2026', domOrder: 2, text: 'b' }
  ];

  assert.deepEqual(
    sortMessagesChronologically(messages).map((m) => m.text),
    ['a', 'b', 'c']
  );
});

test('sortMessagesChronologically: unparseable messages keep their order, at the end', () => {
  const messages = [
    { timestamp: 'bogus', text: 'x1' },
    { timestamp: '10:00, 19/08/2025', text: 'b' },
    { timestamp: '09:00, 19/08/2025', text: 'a' },
    { timestamp: 'bogus', text: 'x2' }
  ];

  assert.deepEqual(
    sortMessagesChronologically(messages).map((m) => m.text),
    ['a', 'b', 'x1', 'x2']
  );
});

test('sortMessagesChronologically: returns a new array and leaves the input alone', () => {
  const messages = [
    { timestamp: '10:00, 19/08/2025', text: 'b' },
    { timestamp: '09:00, 19/08/2025', text: 'a' }
  ];
  const sorted = sortMessagesChronologically(messages);

  assert.notEqual(sorted, messages);
  assert.equal(messages[0].text, 'b', 'input order should be untouched');
  assert.equal(sorted[0].text, 'a');
});

test('sortMessagesChronologically: handles an empty conversation', () => {
  assert.deepEqual(sortMessagesChronologically([]), []);
});
