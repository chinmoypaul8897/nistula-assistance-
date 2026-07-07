// WHY: flat config only — ESLint 10 dropped eslintrc entirely; typescript-eslint
// and eslint-config-prettier are approved CH-00 additions (plain eslint cannot
// lint TypeScript). Recorded in progress.md CH-00 entry.
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
);
