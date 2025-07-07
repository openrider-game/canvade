import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/public-api.ts'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
})
