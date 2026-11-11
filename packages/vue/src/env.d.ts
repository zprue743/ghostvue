/**
 * Library builds leave `process.env.NODE_ENV` for consumer bundlers to replace.
 * This ambient avoids depending on `@types/node` in the Vue package.
 */
declare const process: {
  env: {
    NODE_ENV?: string
  }
}
