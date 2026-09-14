import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = 'true'
process.env.BROWSERSLIST_IGNORE_OLD_DATA = 'true'

export default defineConfig([
  globalIgnores(['dist', '.dev']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // shadcn/ui pattern: Radix primitive aliases (e.g. const Select = SelectPrimitive.Root)
      // are not recognized as components by react-refresh 0.5.5+. Allow those export names.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['Select', 'SelectGroup', 'SelectValue', 'Tabs'] },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
