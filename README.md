# Arabic News Timeline

A small static web UI that visualizes a timeline of events from a JSON file, featuring:
- IBM Plex Sans Arabic as the default font.
- Free-text search across title/summary/location/source.
- Date sorting (oldest first / newest first).
- Date range filtering (from/to).
- Clickable keyword cloud with multi-select filtering.

> The UI is Arabic, and the project is static. You can open it directly without any runtime or tools.

---

## Quick Start
- Open `index.html` in your browser (double-click it).
- The app will read `news.json` from the same folder and render the timeline.

> Keep `index.html`, `style.css`, `app.js`, and `news.json` in the same directory because the app uses relative paths.

---

## Project Structure
```
.
├── index.html     # Page layout: header, controls, keyword cloud, timeline container
├── style.css      # Styles: IBM Plex Sans Arabic, controls, keyword cloud, cards
├── app.js         # Logic: data load + search + sort + date range + keyword cloud + filtering
└── news.json      # Data source (array of events)
```

## Data Format (news.json)
Each event looks like:
```json
{
  "date": "2023-04-15",     // ISO short format YYYY-MM-DD
  "title": "Event title",
  "location": "City/Place",
  "summary": "Short description of the event",
  "source": "Source name"
}
```
Notes:
- Sorting and date-range filtering expect the ISO short date format `YYYY-MM-DD`.
- `news.json` may contain `//` or `/* */` comments; the app strips them before `JSON.parse`.

---

## Features & Usage
- Search: type any phrase; results update with a small debounce.
- Sort: choose oldest-first or newest-first.
- Date range: set a start and/or end date to narrow results.
- Keyword cloud:
  - Keywords are extracted from titles and summaries (with Arabic normalization and stopword removal).
  - Only frequent words are shown (by default: appearing at least 2 times) with size/weight scaled by frequency.
  - Click a keyword to toggle it. You can select multiple keywords. Filtering is AND-based (an event must contain all selected keywords).
- Reset: clears search, date range, sort to defaults, and any selected keywords.

---

## Keyword Cloud Technical Notes
- Arabic normalization (in `app.js`):
  - Lowercasing, removing diacritics and Tatweel, unifying Alef forms and hamzas, converting \u0649 to \u064A, and stripping punctuation.
- Stopwords: see the `AR_STOPWORDS` set in `app.js` to ignore common words.
- Thresholds and caps:
  - Words with frequency < 2 are hidden by default; adjust in `renderKeywordCloud`.
  - The cloud is capped at the top 60 words to avoid clutter; adjust the limit if needed.
- Keyword filtering logic: AND across selected keywords, matched against tokenized title+summary.

---

## Customization
- Font: Google Fonts for IBM Plex Sans Arabic is included in `index.html` and applied in `style.css`. Adjust families/weights as needed.
- Colors and look-and-feel: tweak `style.css` (controls, cards, cloud).
- Cloud thresholds/count: adjust in `app.js` inside `renderKeywordCloud`.
- Search fields: currently use `title`, `summary`, `location`, `source`. Add/remove fields inside `applyFilters`.

---

## Troubleshooting
- No data appears:
  - Ensure `news.json` is in the same folder as `index.html` and the filename matches exactly.
  - Check the browser console for JSON or network errors.
  - Some browsers restrict file access from `file://`. If that happens, try another browser or serve the folder with any simple static server.
- Encoding/RTL:
  - The page and CSS are RTL with an Arabic font; ensure your JSON file uses UTF-8.
- Dates:
  - Ensure all dates use `YYYY-MM-DD`. Filtering compares ISO date strings to avoid timezone issues.

---

## License
MIT
