# frozen_string_literal: true

require_relative 'ldl/version'
require_relative 'ldl/renderer'
require_relative 'ldl/extension'

module Asciidoctor
  module Ldl
    # Register the block and block-macro processors with an Asciidoctor
    # extension registry (defaults to the global one).
    def self.register(registry = Asciidoctor::Extensions)
      registry.block Asciidoctor::Ldl::BlockProcessor, :ldl
      registry.block_macro Asciidoctor::Ldl::BlockMacroProcessor, :ldl
    end
  end
end

Asciidoctor::Extensions.register do
  block Asciidoctor::Ldl::BlockProcessor, :ldl
  block_macro Asciidoctor::Ldl::BlockMacroProcessor, :ldl
end
