# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/OpenPowerShift/asciidoctor-ldl/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/OpenPowerShift/asciidoctor-ldl/releases/tag/v0.1.0
