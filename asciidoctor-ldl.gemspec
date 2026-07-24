# frozen_string_literal: true

require_relative 'lib/asciidoctor/ldl/version'

Gem::Specification.new do |spec|
  spec.name        = 'asciidoctor-ldl'
  spec.version     = Asciidoctor::Ldl::VERSION
  spec.authors     = ['Daniel Mulholland']
  spec.email       = ['dan.mulholland@gmail.com']

  spec.summary     = 'Asciidoctor extension for OpenPowerShift LDL logic diagrams'
  spec.description  = <<~DESC
    An Asciidoctor extension that renders protection-relay / logic diagrams
    written in the Logic Diagram Language (LDL) — the
    @openpowershift/logic-diagram-language npm package — into SVG or PNG at
    conversion time. SVG output is vector and embeds cleanly in asciidoctor-pdf;
    PNG is available via @resvg/resvg-js. Format, scale, theme and label
    visibility are controlled with AsciiDoc attributes.
  DESC

  spec.homepage = 'https://github.com/OpenPowerShift/asciidoctor-ldl'
  spec.license  = 'MIT'

  spec.metadata = {
    'homepage_uri'          => spec.homepage,
    'source_code_uri'       => spec.homepage,
    'bug_tracker_uri'       => "#{spec.homepage}/issues",
    'changelog_uri'         => "#{spec.homepage}/blob/main/CHANGELOG.md",
    'rubygems_mfa_required' => 'true'
  }

  # Works on older Rubies; avoids 3.x-only syntax throughout.
  spec.required_ruby_version = '>= 2.5.0'

  spec.files = Dir[
    'lib/**/*.rb',
    'lib/**/*.mjs',
    'README.adoc',
    'RELEASING.adoc',
    'CHANGELOG.md',
    'LICENSE'
  ]
  spec.require_paths = ['lib']

  # Only Asciidoctor is required at the Ruby layer. Node and the LDL npm package
  # (plus @resvg/resvg-js for PNG) are external runtime prerequisites, kept out
  # of the gem to honour the "ruby + node + npm package" minimal footprint.
  spec.add_runtime_dependency 'asciidoctor', '>= 2.0', '< 3.0'

  spec.add_development_dependency 'minitest', '~> 5.0'
  spec.add_development_dependency 'rake', '~> 13.0'
end
