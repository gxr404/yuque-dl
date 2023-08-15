import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

export default defineConfig({
  input: {
    index: 'src/index.ts',
    cli: 'src/cli.ts'
  },
  output:[
    {
      format: "cjs",
      dir: "dist/cjs"
    },
    {
      format: "es",
      dir: "dist/es",
    },
  ],
  plugins: [
    typescript(),
    json()
  ]
})


