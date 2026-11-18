# JSON View

Format, validate and explore JSON in the browser.

**Use it: https://diwakersurya.github.io/json-view/**

- Format with 2 spaces, 4 spaces or tabs, or minify
- Syntax-highlighted tree you can fold, with a bracket colour per nesting depth
- Search keys and values, with a match count and next / previous
- Line numbers beside the input. Errors point at the line and column, mark the line, and jump to that spot
- Hover a row for **Copy value** and **Copy path** (`$.goldenRecord.tracks[0].title`)
- Paste with Ctrl/⌘ + V or the **Paste** button and valid JSON is formatted on arrival
- Open or drop a `.json` file, copy the result or download it as `data.json`
- Numbers stay as written (`1.0`, big integers) in browsers that expose number source text
- Light, dark or your system setting, and a divider you can drag. Both choices are remembered in your browser

| Shortcut | Does |
|---|---|
| Ctrl/⌘ + Enter | Format |
| Ctrl/⌘ + K | Search the tree |
| Enter, Shift + Enter in search | Next, previous match |

Everything runs in the page. There are no dependencies and no build step, and the page only ever fetches its own files, so nothing you paste leaves your machine.

## Install it, use it offline

After the first visit the page keeps a copy of itself and opens without a connection. In Chrome or Edge, use **Install** in the address bar to get it as its own window; on a phone, use **Add to Home Screen**.

## Open with JSON in the URL

Put percent-encoded JSON after `#` and the page opens with it loaded:

```
https://diwakersurya.github.io/json-view/#%7B%22hello%22%3A%5B1%2C2%5D%7D
```

The part after `#` is never sent to the server, so the JSON still stays on your machine. It also works with game mode: `?mode=game#…`.

JSON from a link is formatted like a paste. If it does not parse, the page says so and removes it from the URL, so you can copy it again and press **Paste**.

Open whatever is on the clipboard, from a macOS shell:

```sh
jv() { open "https://diwakersurya.github.io/json-view/#$(pbpaste | jq -sRr @uri)"; }
```

Or as a [Raycast](https://www.raycast.com) Quicklink, which percent-encodes the clipboard for you:

```
https://diwakersurya.github.io/json-view/#{clipboard}
```

URLs have a length limit, so for very large documents open or drop the file instead.

## Game mode

Press **Play**, or open [`?mode=game`](https://diwakersurya.github.io/json-view/?mode=game), and the JSON you pasted becomes a dungeon drawn on a canvas.

- Every object or array is a room. Objects have rounded walls, arrays have square ones, and the wall colour is the nesting depth.
- Children lie on the floor: notes are strings, coins are numbers, switches are booleans, an empty ring is `null`, and a hatch leads into a nested object or array.
- The game names a path, such as `$.goldenRecord.tracks[1].artist`. Walk there and claim the value. The part of the path you have reached lights up.

| | Keyboard | Touch or mouse |
|---|---|---|
| Walk | Arrows or WASD, Shift to run | Tap a spot |
| Use what you stand on | Enter or Space | Tap yourself |
| Go up a level | Esc or Backspace | Use the stairs in the corner |

Play switches in place, so the JSON in the input comes along. Opening `?mode=game` directly plays the sample.

## Run locally

```sh
git clone https://github.com/diwakersurya/json-view.git
open json-view/index.html
```

Open `index.html?test` to run the built-in self-check. The tab title reads `TESTS OK` when it passes.

## Limits

- Search highlights whole rows, not the matching letters, and reads the whole document on every keystroke.
- In Chrome an error in a document under 21 characters has no line and column, because the browser does not report a position.
- Parsing uses `JSON.parse`, so duplicate keys collapse to the last one and integer-like keys move to the front of their object.
- Documents over 5,000 values open only their top two levels at first. "Expand all" on very large documents is slow.

## License

MIT
