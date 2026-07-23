# frozen_string_literal: true

require 'test_helper'

# Pure-Ruby behaviour of the Renderer: option handling, filenames, command
# construction and caching. These do not shell out to Node.
class RendererTest < Minitest::Test
  def test_defaults
    r = Asciidoctor::Ldl::Renderer.new
    assert_equal 'svg', r.format
    assert_in_delta 1.0, r.scale
    assert_equal 'light', r.theme
  end

  def test_rejects_unknown_format
    err = assert_raises(Asciidoctor::Ldl::Renderer::Error) do
      Asciidoctor::Ldl::Renderer.new(format: 'gif')
    end
    assert_match(/unsupported format/, err.message)
  end

  def test_rejects_non_positive_scale
    assert_raises(Asciidoctor::Ldl::Renderer::Error) do
      Asciidoctor::Ldl::Renderer.new(scale: 0)
    end
    assert_raises(Asciidoctor::Ldl::Renderer::Error) do
      Asciidoctor::Ldl::Renderer.new(scale: 'huge')
    end
  end

  def test_scale_accepts_string
    assert_in_delta 2.5, Asciidoctor::Ldl::Renderer.new(scale: '2.5').scale
  end

  def test_content_addressed_filename_is_stable_and_option_sensitive
    a = Asciidoctor::Ldl::Renderer.new(format: 'svg')
    b = Asciidoctor::Ldl::Renderer.new(format: 'png')
    assert_equal a.target_filename('O1 = I1'), a.target_filename('O1 = I1')
    refute_equal a.target_filename('O1 = I1'), a.target_filename('O1 = I2')
    assert a.target_filename('x').end_with?('.svg')
    assert b.target_filename('x').end_with?('.png')
    refute_equal a.target_filename('x').sub('.svg', ''),
                 b.target_filename('x').sub('.png', '')
  end

  def test_explicit_basename_is_sanitized
    r = Asciidoctor::Ldl::Renderer.new(format: 'png')
    assert_equal 'trip-matrix.png', r.target_filename('x', 'trip-matrix')
    assert_equal 'b.png', r.target_filename('x', 'a/b') # path stripped (no traversal)
    assert_equal 'evil.png', r.target_filename('x', '../../evil') # traversal blocked
    assert_equal 'weird_name.png', r.target_filename('x', 'weird name')
    assert_equal 'keep.png', r.target_filename('x', 'keep.png') # ext not doubled
  end

  def test_command_for_includes_all_flags
    r = Asciidoctor::Ldl::Renderer.new(format: 'png', scale: 2, theme: 'dark',
                                       show_ids: true, show_labels: false,
                                       node: 'mynode', package_dir: '/pkg')
    cmd = r.command_for('/out/x.png')
    assert_equal 'mynode', cmd[0]
    assert_includes cmd, '--format'
    assert_equal 'png', cmd[cmd.index('--format') + 1]
    assert_equal '2', cmd[cmd.index('--scale') + 1]
    assert_equal 'dark', cmd[cmd.index('--theme') + 1]
    assert_includes cmd, '--show-ids'
    assert_includes cmd, '--no-show-labels'
    assert_equal '/pkg', cmd[cmd.index('--package-dir') + 1]
    assert_equal '/out/x.png', cmd[cmd.index('--out') + 1]
  end

  def test_render_uses_cache_when_sidecar_matches
    Dir.mktmpdir do |dir|
      r = Asciidoctor::Ldl::Renderer.new(format: 'svg', out_dir: dir, node: 'node')
      source = 'O1 = I1 AND I2'
      name = r.target_filename(source)
      path = File.join(dir, name)
      # Pre-seed the file and a matching sidecar; render must not invoke node.
      File.write(path, '<svg/>')
      File.write("#{path}.ldlcache", r.send(:digest, source))
      def r.command_for(*)
        raise 'node should not be called on a cache hit'
      end
      assert_equal name, r.render(source)
    end
  end

  def test_render_ignores_stale_sidecar
    skip_unless_renderable
    Dir.mktmpdir do |dir|
      r = Asciidoctor::Ldl::Renderer.new(format: 'svg', out_dir: dir,
                                         package_dir: ldl_package_dir)
      source = 'O1 = I1 AND I2'
      name = r.render(source)
      path = File.join(dir, name)
      # Corrupt the sidecar; the next render must regenerate.
      File.write("#{path}.ldlcache", 'stale')
      File.write(path, 'OLD')
      r.render(source)
      refute_equal 'OLD', File.read(path)
    end
  end
end
