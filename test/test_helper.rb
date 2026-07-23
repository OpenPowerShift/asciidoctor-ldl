# frozen_string_literal: true

$LOAD_PATH.unshift File.expand_path('../lib', __dir__)

require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require 'asciidoctor'
require 'asciidoctor-ldl'

module LdlTestSupport
  module_function

  # Locate a directory from which the LDL npm package resolves. Preference:
  #   1. LDL_PACKAGE_DIR (explicit)
  #   2. test/js  (CI runs `npm install` here)
  #   3. a sibling ../logic-diagram checkout (developer convenience)
  # Returns nil when none is available, so the caller can skip.
  def ldl_package_dir
    candidates = []
    candidates << ENV['LDL_PACKAGE_DIR'] if ENV['LDL_PACKAGE_DIR']
    candidates << File.expand_path('js', __dir__)
    candidates << File.expand_path('../../logic-diagram', __dir__)
    candidates.compact.find { |dir| lib_resolvable?(dir) }
  end

  def lib_resolvable?(dir)
    return false unless dir && File.directory?(dir)

    File.exist?(File.join(dir, 'lib', 'index.js')) || # direct checkout
      File.exist?(File.join(dir, 'node_modules', '@openpowershift',
                            'logic-diagram-language', 'lib', 'index.js'))
  end

  # Whether @resvg/resvg-js resolves from +dir+ (required for PNG tests).
  def png_capable?(dir)
    return false unless dir

    File.directory?(File.join(dir, 'node_modules', '@resvg', 'resvg-js'))
  end

  def node_available?
    system('node', '--version', out: File::NULL, err: File::NULL)
  end
end

class Minitest::Test
  include LdlTestSupport

  def skip_unless_renderable
    skip 'node not available' unless node_available?
    skip 'LDL npm package not resolvable (set LDL_PACKAGE_DIR or run npm install in test/js)' unless ldl_package_dir
  end
end
