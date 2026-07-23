# frozen_string_literal: true

# Conventional require name (matches the gem name) so that:
#   asciidoctor -r asciidoctor-ldl document.adoc
# works. Delegates to the namespaced implementation.
require_relative 'asciidoctor/ldl'
