import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Installs the AnimationEvent constructor jsdom lacks, before React binds
    // its event names. See the file for why this cannot be done in a test.
    setupFiles: ['./src/test/setup.ts'],
  },
})
