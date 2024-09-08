import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

export default defineConfig({
  input: {
    index: 'src/index.ts',
    cli: 'src/cli.ts'
  },
  output:[
    {
      format: 'cjs',
      dir: 'dist/cjs'
    },
    {
      format: 'es',
      dir: 'dist/es',
    },
  ],
  plugins: [
    typescript(),
    terser()
  ]
})


