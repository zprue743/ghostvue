/**
 * Optional themed wrappers and the default stylesheet. Behavior stays in
 * `@slop-ui/vue`; importing from this package is the easy styled path.
 *
 * The CSS side-effect import means one `SlButton` import from here loads the
 * default theme. Headless installs never pull this package.
 */
import './default.css'

export {
  SlButton,
  type SlButtonExposed,
  type SlButtonSize,
  type SlButtonTone,
  type SlButtonType,
  type SlButtonVariant,
} from './sl-button'
