# Local web report checklist

This checklist is independently written. Original source: user's modern-web-guidance snapshot 2026_10_16-6654652b; see integration registry for source hashes.

- Reports use text escaping at the HTML output boundary, with no executable source markup or remote assets.
- Use a document title, language, main heading and a clear reading order.
- Data tables retain caption, header and body semantics. Column headers use scope. Overflow containers are keyboard-focusable named regions.
- Long evidence lines wrap or scroll; information is not conveyed by color alone.
- Static HTML works without JavaScript or browser-specific APIs. No unsupported sanitizer is needed for text-only output.
- Test source values containing angle brackets, ampersands, quotes, script-like input, long words and Unicode.
- Additional browser APIs require current primary-source verification and supported fallbacks. Relevant public references: [MDN HTML tables](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_table_basics) and [WAI tables](https://www.w3.org/WAI/tutorials/tables/).

Research notes: locally consulted guide IDs `sanitize-untrusted-html`, `responsive-table`, and `accessibility`. The implementation keeps reports text-only, retains semantic tables and provides focusable scroll regions rather than adding a sanitizer dependency.
