/**
 * Lets the stdio smoke test run `src/*.ts` in a real child process without a
 * build: Node strips the types, and this hook maps the `.js` specifiers that
 * NodeNext source uses onto their `.ts` files when no `.js` file exists.
 * Needs Node 22.18+ (type stripping on by default, `module.registerHooks`).
 */
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (specifier.startsWith('.') && specifier.endsWith('.js')) {
        return nextResolve(`${specifier.slice(0, -'.js'.length)}.ts`, context)
      }
      throw error
    }
  },
})
