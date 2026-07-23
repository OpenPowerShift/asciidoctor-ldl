# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-07-23

### Changed

- First release published from CI via trusted publishing for **both** the gem
  (RubyGems) and the npm package. No functional changes since 0.2.0 (which was
  the initial, manually published npm release; the gem's first release carrying
  the 0.2.0 changes is this one).
- The npm release workflow now skips publishing a version already on the
  registry, so a re-triggered tag still attaches release assets without failing.

## [0.2.0] - 2026-07-23

### Added

- **Asciidoctor.js extension**, published to npm as
  `@openpowershift/asciidoctor-ldl`. It registers the same `[ldl]` block and
  `ldl::` macro, honours the same attributes, and emits the same roles as the
  Ruby gem. In Node it writes SVG/PNG files with identical content-hash names;
  in the browser it embeds SVG inline. Ships as a single bundled JS file
  (Node ESM + CJS and a browser build) with TypeScript declarations.
- A shared, environment-agnostic rendering core (`render-core.mjs`) used by both
  the gem's Node helper and the npm extension, so Ruby and JavaScript produce
  **byte-identical** SVG and identical file names. A parity test suite asserts
  this across formats, scale, theme, labels and font options.
- A **standalone single-file build** (`@openpowershift/asciidoctor-ldl/standalone`,
  and attached to each GitHub release as `asciidoctor-ldl-standalone.js`) with
  the renderer bundled in. It renders SVG inline and synchronously — drop it into
  Asciidoctor VS Code's `.asciidoctor/lib` with no `npm install` required.

### Changed

- The content-hash used for output file names now uses a canonical, cross-tool
  serialization (this changes generated file names from earlier versions; output
  content is unchanged aside from the name).
- Gem and npm package versions are released in lockstep from a single tag.

## [0.1.2] - 2026-07-23

### Added

- `font-family` / `ldl-font-family` attribute controlling the font used for
  diagram text, and a cross-platform default
  (`DejaVu Sans, Bitstream Vera Sans, Liberation Sans, Arial, sans-serif`).

### Fixed

- Gate/comparator glyphs `−` (U+2212) and `≥` (U+2265) no longer disappear in
  asciidoctor-pdf. The renderer's generic `sans-serif` was mapped by prawn-svg
  to the built-in Helvetica, which lacks those glyphs; the new default names
  real fonts first (register one — e.g. DejaVu Sans — in your PDF theme).

## [0.1.1] - 2026-07-23

### Added

- Pass the `pdfwidth` and `scaledwidth` image attributes through to the
  generated image, so diagram size can be controlled in asciidoctor-pdf (and
  `scaledwidth`/`width` elsewhere). Also forwards `window`, `opts` and `fit`.

## [0.1.0] - 2026-07-23

### Added

- Initial release.
- `[ldl]` delimited block and `ldl::file.ldl[]` block macro that render
  [Logic Diagram Language](https://github.com/OpenPowerShift/logic-diagram-language)
  source to an image at conversion time.
- SVG output (vector, isomorphic, no extra dependency) and PNG output (via
  `@resvg/resvg-js`).
- `format`, `scale`, `theme`, `show-ids` and `show-labels` attributes, settable
  per block or document-wide with the `ldl-` prefix.
- Every generated image carries `ldl`, `ldl-<format>` and `ldl-<theme>` roles for
  CSS / asciidoctor-pdf theme targeting.
- Content-addressed caching with a digest sidecar so unchanged diagrams are not
  re-rendered.

[Unreleased]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/OpenPowerShift/asciidoctor-ldl/releases/tag/v0.1.0
