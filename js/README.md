# @openpowershift/asciidoctor-ldl

An [Asciidoctor.js](https://docs.asciidoctor.org/asciidoctor.js/latest/) 4
extension that renders [Logic Diagram Language
(LDL)](https://github.com/OpenPowerShift/logic-diagram-language) — SEL-style
protection/logic diagrams — to **SVG** or **PNG** at conversion time.

It is the JavaScript counterpart of the
[`asciidoctor-ldl`](https://rubygems.org/gems/asciidoctor-ldl) Ruby gem and
shares the **same rendering core**, so a given diagram and options produce
byte-identical output from either. Ships as a single bundled file (Node ESM +
CommonJS and a browser build) with TypeScript types.

## Install

```console
npm install @openpowershift/asciidoctor-ldl @openpowershift/logic-diagram-language
npm install @resvg/resvg-js        # only needed for format=png
```

`@openpowershift/logic-diagram-language` is the renderer (a runtime dependency);
`@resvg/resvg-js` is optional and only used for PNG output.

## Use (Node)

Rendering is asynchronous, so `convert` returns a promise — always `await` it.

```js
import { Extensions, convert } from '@asciidoctor/core'
import ldl from '@openpowershift/asciidoctor-ldl'

const registry = Extensions.create()
ldl.register(registry)

const html = await convert(source, { extension_registry: registry, safe: 'safe' })
```

```asciidoc
[ldl]
....
TRIP.Name = "Trip"
TRIP = OVERCURRENT AND NOT BLOCK OR (EARTH AND MANUAL)
....

ldl::diagrams/trip.ldl[format=png, scale=2]
```

Images are written under `imagesdir`/`imagesoutdir`, with content-hash file
names and digest-sidecar caching — identical to the gem.

## Command line

```console
npx asciidoctor -r @openpowershift/asciidoctor-ldl document.adoc
```

## Browser

`@openpowershift/asciidoctor-ldl/browser` renders **SVG only** and embeds the
diagram inline. Your bundler/import map must provide the renderer.

```js
import ldl from '@openpowershift/asciidoctor-ldl/browser'
```

## Attributes

`format` (`svg`|`png`), `scale`, `theme` (`light`|`dark`), `show-ids`,
`show-labels`, `font-family`, plus a positional `target` and `format`, and the
document-wide `ldl-*` forms (`ldl-format`, `ldl-scale`, …). Every image gets the
roles `ldl`, `ldl-<format>`, `ldl-<theme>`. See the
[full documentation](https://github.com/OpenPowerShift/asciidoctor-ldl#attributes).

## License

MIT © Daniel Mulholland
