# frozen_string_literal: true

require 'asciidoctor'
require 'asciidoctor/extensions'
require_relative 'version'
require_relative 'renderer'

module Asciidoctor
  module Ldl
    # Shared behaviour for the block and block-macro processors: read options
    # from attributes, drive the Renderer, and emit an image (or, on failure,
    # a visible error block).
    module Processor
      # Turn LDL +source+ into an image block placed in +parent+.
      def render_ldl(parent, source, attrs, target_hint)
        doc = parent.document
        renderer = build_renderer(doc, attrs)
        out_dir = renderer.out_dir

        begin
          filename = renderer.render(source, resolve_basename(attrs, target_hint))
        rescue Renderer::Error => e
          return error_block(parent, attrs, e.message)
        end

        create_ldl_image(parent, attrs, filename, renderer, doc)
      end

      private

      def build_renderer(doc, attrs)
        Renderer.new(
          format: attr(attrs, doc, 'format', 'ldl-format', 'svg'),
          scale: attr(attrs, doc, 'scale', 'ldl-scale', nil),
          theme: attr(attrs, doc, 'theme', 'ldl-theme', 'light'),
          show_ids: attr(attrs, doc, 'show-ids', 'ldl-show-ids', nil),
          show_labels: attr(attrs, doc, 'show-labels', 'ldl-show-labels', nil),
          font_family: attr(attrs, doc, 'font-family', 'ldl-font-family', nil),
          node: doc.attr('ldl-node', 'node'),
          package_dir: doc.attr('ldl-package-dir') || doc.attr('ldl-node-modules'),
          out_dir: image_output_dir(doc),
          cache: cache_enabled?(doc)
        )
      end

      # Block/macro attribute wins; otherwise the document attribute; otherwise
      # the default. Empty strings are treated as "unset".
      def attr(attrs, doc, block_key, doc_key, default)
        value = attrs[block_key]
        value = doc.attr(doc_key) if value.nil? || value.to_s.empty?
        value.nil? || value.to_s.empty? ? default : value
      end

      def cache_enabled?(doc)
        raw = doc.attr('ldl-cache')
        return true if raw.nil?

        !%w[false 0 no off].include?(raw.to_s.strip.downcase)
      end

      def resolve_basename(attrs, target_hint)
        candidate = attrs['target'] || target_hint
        return nil if candidate.nil? || candidate.to_s.strip.empty?

        candidate
      end

      # Physical directory the image is written to, following the same
      # conventions as asciidoctor-diagram (imagesoutdir overrides; otherwise
      # imagesdir under the output/base directory).
      def image_output_dir(doc)
        images_outdir = doc.attr('imagesoutdir')
        return images_outdir if images_outdir && !images_outdir.to_s.empty?

        base = doc.attr('outdir')
        base = doc.options[:to_dir] if (base.nil? || base.empty?) && doc.options[:to_dir]
        base ||= doc.base_dir
        images_dir = doc.attr('imagesdir')
        (images_dir && !images_dir.to_s.empty?) ? File.join(base, images_dir) : base
      end

      # Image attributes passed straight through to the generated image block.
      # Includes the sizing attributes for every backend: +width+ (HTML),
      # +pdfwidth+/+scaledwidth+ (asciidoctor-pdf).
      IMAGE_PASSTHROUGH = %w[
        alt title width height pdfwidth scaledwidth align float id link
        window opts fit
      ].freeze

      def create_ldl_image(parent, attrs, filename, renderer, _doc)
        image_attrs = { 'target' => filename }
        IMAGE_PASSTHROUGH.each do |key|
          image_attrs[key] = attrs[key] if attrs.key?(key)
        end
        image_attrs['alt'] ||= (attrs['target'] || 'LDL logic diagram')
        image_attrs['role'] = image_roles(attrs, renderer)
        create_image_block(parent, image_attrs)
      end

      # Always tag the image with the +ldl+ role plus format/theme modifier
      # roles, so it can be targeted from CSS or an asciidoctor-pdf theme.
      # Any author-supplied role is preserved (and wins for ordering).
      def image_roles(attrs, renderer)
        roles = %w[ldl]
        roles << "ldl-#{renderer.format}"
        roles << "ldl-#{renderer.theme}"
        author = attrs['role']
        roles.concat(author.to_s.split) if author && !author.to_s.empty?
        roles.uniq.join(' ')
      end

      def error_block(parent, attrs, message)
        warn "asciidoctor-ldl: #{message}"
        text = "LDL diagram error:\n#{message}"
        Asciidoctor::Block.new(parent, :listing, source: text,
                                                 attributes: { 'role' => 'ldl-error' })
      end
    end

    # Delimited block:
    #
    #   [ldl]
    #   ----
    #   O1 = I1 AND NOT I2
    #   ----
    #
    # Optional positional attributes: [ldl, target-basename, format].
    class BlockProcessor < Asciidoctor::Extensions::BlockProcessor
      include Processor

      use_dsl
      named :ldl
      on_contexts :listing, :literal, :paragraph, :open
      name_positional_attributes 'target', 'format'
      parse_content_as :raw

      def process(parent, reader, attrs)
        render_ldl(parent, reader.source, attrs, attrs['target'])
      end
    end

    # Block macro reading from a file:
    #
    #   ldl::path/to/diagram.ldl[format=png, scale=2]
    class BlockMacroProcessor < Asciidoctor::Extensions::BlockMacroProcessor
      include Processor

      use_dsl
      named :ldl
      name_positional_attributes 'format'

      def process(parent, target, attrs)
        doc = parent.document
        path = doc.normalize_system_path(target, doc.attr('docdir'))
        unless File.readable?(path)
          return error_block(parent, attrs, "cannot read LDL file: #{target}")
        end

        source = File.read(path)
        hint = attrs['target'] || File.basename(target, File.extname(target))
        render_ldl(parent, source, attrs, hint)
      end
    end
  end
end
