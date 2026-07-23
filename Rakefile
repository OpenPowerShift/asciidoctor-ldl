# frozen_string_literal: true

# Provides the `build`, `install` and `release` tasks. The `release` task is
# what the rubygems/release-gem GitHub Action invokes for trusted publishing;
# it detects the already-pushed tag and skips re-tagging, then pushes the gem.
require 'bundler/gem_tasks'
require 'rake/testtask'

Rake::TestTask.new(:test) do |t|
  t.libs << 'test' << 'lib'
  t.pattern = 'test/**/test_*.rb'
  t.warning = false
  t.verbose = true
end

desc 'Run the Node helper test suite (needs node + `npm install` in test/js)'
task :jstest do
  Dir.chdir('test/js') { sh 'node --test .' }
end

task default: :test
