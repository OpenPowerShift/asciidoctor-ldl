# frozen_string_literal: true

require 'test_helper'

# End-to-end: convert real AsciiDoc through Asciidoctor with the extension
# registered, and assert on the generated files and markup. Skips cleanly when
# node or the LDL npm package is unavailable.
class ExtensionTest < Minitest::Test
  def setup
    @tmp = Dir.mktmpdir('ldl-e2e')
  end

  def teardown
    FileUtils.remove_entry(@tmp) if @tmp && File.directory?(@tmp)
  end

  def convert(body, attrs = {})
    skip_unless_renderable
    doc_attrs = {
      'ldl-package-dir' => ldl_package_dir,
      'outdir' => @tmp,          # where image_output_dir anchors
      'imagesdir' => 'images'
    }.merge(attrs)
    # No to_dir/to_file, so convert returns the rendered HTML string; images are
    # written under outdir/imagesdir by the extension itself.
    html = Asciidoctor.convert(
      body,
      safe: :unsafe,
      base_dir: @tmp,
      attributes: doc_attrs,
      standalone: false
    )
    [html, File.join(@tmp, 'images')]
  end

  def test_block_renders_svg_with_roles
    html, images = convert(<<~ADOC)
      [ldl]
      ----
      O1.Name = "Trip"
      O1 = I1 AND NOT I2
      ----
    ADOC
    assert_match %r{<div class="imageblock ldl ldl-svg ldl-light}, html
    assert_match %r{<img[^>]+src="images/ldl-[0-9a-f]+\.svg"}, html
    svgs = Dir[File.join(images, '*.svg')]
    assert_equal 1, svgs.length
    content = File.read(svgs.first)
    assert_includes content, '<svg'
    assert_includes content, 'viewBox'
  end

  def test_named_target_and_scale_and_dark_theme
    _html, images = convert(<<~ADOC)
      [ldl,my-diagram,svg,scale=2,theme=dark]
      ----
      O1 = I1 AND I2
      ----
    ADOC
    path = File.join(images, 'my-diagram.svg')
    assert File.file?(path), 'expected named output file my-diagram.svg'
    svg = File.read(path)
    # scale=2 injects explicit width/height derived from the viewBox.
    vb = svg[/viewBox="0 0 ([\d.]+) /, 1].to_f
    w  = svg[/<svg width="([\d.]+)"/, 1].to_f
    assert_in_delta vb * 2, w, 0.5
  end

  def test_png_output
    skip_unless_renderable
    skip 'resvg not installed' unless png_capable?(ldl_package_dir)
    _html, images = convert(<<~ADOC)
      [ldl,gate,png]
      ----
      O1 = I1 AND I2
      ----
    ADOC
    path = File.join(images, 'gate.png')
    assert File.file?(path)
    # PNG magic number.
    assert_equal "\x89PNG".b, File.binread(path, 4)
  end

  def test_block_macro_reads_file
    skip_unless_renderable
    fixture = File.expand_path('fixtures/trip.ldl', __dir__)
    _html, images = convert("ldl::#{fixture}[format=svg]")
    assert File.file?(File.join(images, 'trip.svg'))
  end

  def test_invalid_source_produces_error_block_not_crash
    html, _images = convert(<<~ADOC)
      [ldl]
      ----
      O1 = = AND
      ----
    ADOC
    assert_match(/ldl-error/, html)
    assert_match(/LDL diagram error/, html)
  end
end
