# JSON View

Format, validate and explore JSON in the browser.

**Use it: https://diwakersurya.github.io/json-view/**

- Format with 2 spaces, 4 spaces or tabs, or minify
- Syntax-highlighted tree you can fold, with a colour per nesting depth
- Errors point at the line and column, with a jump to that spot in the input
- Hover a row to see its path (`$.goldenRecord.tracks[0].title`), click the path to copy it
- Open or drop a `.json` file
- Numbers stay as written (`1.0`, big integers) in browsers that expose number source text
- Light and dark, following your system setting

Everything runs in the page. There are no dependencies, no build step and no network requests, so nothing you paste leaves your machine.

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
