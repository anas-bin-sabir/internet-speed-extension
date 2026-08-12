# Internet Speed Monitor

A minimal Manifest V3 Chrome extension that measures the current internet download speed from a browser popup.

## Overview

The extension downloads a test file from a configurable URL and streams the response using the Streams API, computing download speed in Mbps as bytes arrive. There is no backend, no database, no authentication, and no external state management library.

## Tech stack

- TypeScript
- React
- Vite
- Manifest V3

## Project structure

```
public/
  manifest.json       Chrome extension manifest (MV3)
src/
  main.tsx            React entry point, mounts Popup
  index.css            Global styles and color theme
  popup/
    Popup.tsx           Popup UI component
  services/
    speedTest.ts         Streaming download speed measurement logic
  types/
    speed.ts              Shared TypeScript types
index.html            Popup HTML shell (built by Vite, referenced by manifest.json)
```

## How the speed test works

1. The popup calls `measureDownloadSpeed` from `src/services/speedTest.ts`.
2. That function issues `fetch(TEST_FILE_URL, { cache: "no-store" })` against a single, easily changeable URL constant.
3. The response body is read as a `ReadableStream` using `reader.read()` in a loop, rather than waiting for the full file to download.
4. Each chunk's byte length is added to a running total.
5. Roughly every 150ms, the function computes:

   ```
   Mbps = (bytesReceived * 8) / elapsedSeconds / 1_000_000
   ```

   using `performance.now()` for timing, and reports the value through a progress callback.
6. The popup uses that callback to update the displayed Mbps live, while the stream is still being read.
7. When the stream finishes, a final Mbps value is calculated and returned.

## State handling in the popup

The popup tracks one of four statuses: `idle`, `testing`, `complete`, `error`.

To avoid stale updates (for example, if a new test starts, or the popup closes mid-test):

- A generation counter (`testIdRef`) increments on every test run. Progress and result callbacks only update state if they belong to the current run.
- An `AbortController` is created per run and aborted when the component unmounts, canceling any in-flight fetch.

The "Run Test" button is disabled while a test is in progress.

## Color theme

The interface uses the following palette, defined as CSS custom properties in `src/index.css`:

| Token | Light mode | Dark mode | Usage |
|---|---|---|---|
| `--bg` | `#e4e8d1` | `#22251a` | Popup background |
| `--text` | `#4a5240` | `#c7cbb2` | Body text |
| `--text-h` | `#262b1c` | `#e4e8d1` | Headings, title |
| `--border` | `#899260` | `#899260` | Borders and button outline |
| `--accent` | `#e62e0a` | `#ff6a45` | Speed value, button background |
| `--accent-contrast` | `#ffffff` | `#22251a` | Button text on accent background |

Dark mode values are derived from the same three source colors (`#e62e0a`, `#899260`, `#e4e8d1`) by adjusting lightness only, so the palette stays consistent across `prefers-color-scheme`.

## Building the extension

```
npm install
npm run build
```

This runs a TypeScript check (`tsc -b`) followed by `vite build`, producing a `dist/` folder that contains `manifest.json`, `index.html`, and the bundled JS/CSS assets.

## Loading into Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked".
4. Select the `dist/` folder produced by `npm run build`.
5. Click the extension icon in the toolbar to open the popup and run a test.

## Changing the test file URL

The download URL is a single constant in `src/services/speedTest.ts`:

```ts
export const TEST_FILE_URL = "https://speed.cloudflare.com/__down?bytes=25000000";
```

Change the URL or byte count and rebuild to point the test at a different file or host.

## Limitations

- Only measures download speed, not upload speed or latency.
- Accuracy depends on the network conditions between the browser and the chosen test host, and on that host not being a bottleneck itself.
- No historical data or persistence between test runs is stored.
