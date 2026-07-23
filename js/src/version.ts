// The package version, injected by esbuild's `define`. Included in the content
// digest so it must equal the gem version (they are released in lockstep) for
// generated file names to match between the Ruby and JS integrations.
export const VERSION: string =
  typeof __LDL_VERSION__ !== 'undefined' ? __LDL_VERSION__ : '0.0.0-dev';
