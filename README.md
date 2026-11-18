# JSON View

Format, validate and explore JSON in the browser.

**Use it: https://diwakersurya.github.io/json-view/**

- Format with 2 spaces, 4 spaces or tabs, or minify
- Syntax-highlighted tree you can fold, with a colour per nesting depth
- Errors point at the line and column, with a jump to that spot in the input
- Hover a row to see its path (`$.goldenRecord.tracks[0].title`), click the path to copy it
- Paste with Ctrl/⌘ + V or the **Paste** button and valid JSON is formatted on arrival
- Open or drop a `.json` file
- Numbers stay as written (`1.0`, big integers) in browsers that expose number source text
- Light and dark, following your system setting

Everything runs in the page. There are no dependencies, no build step and no network requests, so nothing you paste leaves your machine.

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

- Parsing uses `JSON.parse`, so duplicate keys collapse to the last one and integer-like keys move to the front of their object.
- Documents over 5,000 values open only their top two levels at first. "Expand all" on very large documents is slow.

## License

MIT
