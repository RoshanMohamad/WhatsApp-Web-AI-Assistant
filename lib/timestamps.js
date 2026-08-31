/**
 * Timestamp parsing and chronological ordering for WhatsApp messages.
 *
 * WhatsApp Web exposes a message's time through the `data-pre-plain-text`
 * attribute, formatted in the browser's locale. That means the same
 * conversation can be stamped "7:04 AM, 7/31/2026" on one machine and
 * "07:04, 31/07/2026" on another, so parsing has to cope with both 12- and
 * 24-hour clocks and with day-first, month-first and ISO date orders.
 *
 * The module is shared between the extension (loaded as a content script,
 * where it attaches to `globalThis`) and the test suite (where it is required
 * as a CommonJS module).
 */
(function (root, factory) {
  const api = factory();

  if (root) {
    root.WhatsAppTimestamps = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAY_FIRST = 'dayFirst';
  const MONTH_FIRST = 'monthFirst';

  const TIME_PATTERN = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?/i;
  const DATE_PATTERN = /(\d{1,4})[/.-](\d{1,2})[/.-](\d{2,4})/;

  /**
   * The date order the current browser locale uses, as a last resort when a
   * conversation contains no date that disambiguates itself.
   *
   * @returns {'dayFirst'|'monthFirst'}
   */
  function getLocaleDateOrder() {
    try {
      const parts = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' })
        .formatToParts(new Date(2000, 0, 2));
      const first = parts.find((part) => part.type === 'day' || part.type === 'month');
      return first && first.type === 'month' ? MONTH_FIRST : DAY_FIRST;
    } catch (error) {
      return DAY_FIRST;
    }
  }

  /**
   * Work out whether a conversation's dates are day-first or month-first.
   *
   * "8/6/2026" is ambiguous on its own, but a single date in the conversation
   * with a component above 12 settles it for all of them, since every message
   * in one export was rendered by the same browser.
   *
   * @param {Array<{timestamp?: string}>} messages
   * @returns {'dayFirst'|'monthFirst'}
   */
  function detectDateOrder(messages) {
    for (const message of messages) {
      const match = String((message && message.timestamp) || '').match(DATE_PATTERN);
      if (!match || match[1].length === 4) continue;

      if (parseInt(match[1], 10) > 12) return DAY_FIRST;
      if (parseInt(match[2], 10) > 12) return MONTH_FIRST;
    }

    return getLocaleDateOrder();
  }

  /**
   * Parse a WhatsApp timestamp into milliseconds since the epoch.
   *
   * Handles "7:04 AM, 7/31/2026", "09:21, 19/08/2025", "21:05, 2025-08-19",
   * "8:30 p.m., 06.08.26" and time-only stamps.
   *
   * @param {string} timestampStr
   * @param {'dayFirst'|'monthFirst'} [dateOrder] how to read an ambiguous date
   * @returns {number|null} null when the string holds no recognisable time
   */
  function parseTimestamp(timestampStr, dateOrder = DAY_FIRST) {
    try {
      if (!timestampStr) return null;
      const str = String(timestampStr);

      const timeMatch = str.match(TIME_PATTERN);
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const meridiem = timeMatch[4] ? timeMatch[4].toLowerCase().replace(/\./g, '') : null;

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      const dateMatch = str.match(DATE_PATTERN);
      if (!dateMatch) {
        // Time only - assume today so it still sorts after dated history
        const today = new Date();
        return new Date(
          today.getFullYear(), today.getMonth(), today.getDate(),
          hours, minutes, seconds
        ).getTime();
      }

      const first = parseInt(dateMatch[1], 10);
      const second = parseInt(dateMatch[2], 10);
      const third = parseInt(dateMatch[3], 10);
      let day, month, year;

      if (dateMatch[1].length === 4) {
        // ISO style: 2025-08-19
        year = first;
        month = second;
        day = third;
      } else {
        year = third;
        if (first > 12) {
          day = first;
          month = second;
        } else if (second > 12) {
          month = first;
          day = second;
        } else if (dateOrder === MONTH_FIRST) {
          month = first;
          day = second;
        } else {
          day = first;
          month = second;
        }
      }

      if (year < 100) year += 2000;

      const time = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      return Number.isNaN(time) ? null : time;
    } catch (error) {
      return null;
    }
  }

  /**
   * Order messages oldest-first.
   *
   * Messages are cached as they scroll into view rather than in reading order,
   * so the cache has to be sorted before it is exported or handed to the model.
   *
   * @param {Array<{timestamp?: string, domOrder?: number}>} messages
   * @returns {Array} a new array; the input is left untouched
   */
  function sortMessagesChronologically(messages) {
    const dateOrder = detectDateOrder(messages);

    // Decorate with the parsed time and the original position so that equal
    // timestamps keep a deterministic order.
    const decorated = messages.map((message, index) => ({
      message,
      index,
      time: parseTimestamp(message && message.timestamp, dateOrder)
    }));

    decorated.sort((a, b) => {
      // Messages we could not parse keep their original order, at the end
      if (a.time === null || b.time === null) {
        if (a.time === b.time) return a.index - b.index;
        return a.time === null ? 1 : -1;
      }

      if (a.time !== b.time) return a.time - b.time;

      // WhatsApp timestamps only go down to the minute, so messages sent in
      // the same minute are ordered by where they sit in the chat
      const domA = a.message.domOrder;
      const domB = b.message.domOrder;
      if (typeof domA === 'number' && typeof domB === 'number' && domA !== domB) {
        return domA - domB;
      }

      return a.index - b.index;
    });

    return decorated.map((entry) => entry.message);
  }

  return {
    DAY_FIRST,
    MONTH_FIRST,
    getLocaleDateOrder,
    detectDateOrder,
    parseTimestamp,
    sortMessagesChronologically
  };
});
