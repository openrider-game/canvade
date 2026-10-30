import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/public-api.ts'],
    // ESM for the bundlers, linking the imports directly, and CommonJS for require
    format: ['esm', 'cjs'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
})
