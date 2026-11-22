/**
 * PrimeVue typing: string `field` is not keyed to row type.
 * This file is NOT included in tsconfig — run manually:
 *   pnpm exec vue-tsc -p tsconfig.json --noEmit src/type-tests/prime-column-field.fail.ts
 */
import type { Invoice } from '../data/invoices'

type Row = Invoice

// Consumer believes field is type-safe; PrimeVue accepts any string at compile time.
declare const row: Row
const _probe = (row as Row)['does-not-exist']

export {}