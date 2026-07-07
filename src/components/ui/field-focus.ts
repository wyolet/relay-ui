// The one focus treatment for field-shaped controls: a quiet border accent.
// No standing ring, no fill change — relay-ui's near-neutral palette makes
// tinted washes read as murk rather than color, so fields signal focus with
// the border alone and stay still. (The wash tokens live on in the Button
// `default` rung, where a static tonal ground works.)
// Compose these constants instead of hand-rolling focus classes so every
// field in the app stays in lockstep.

// The resting field frame — border and fill that Input/Textarea/SelectTrigger
// carry. Composite fields (chip wrappers, search boxes) use this so they sit
// on exactly the same ground as a plain Input.
export const fieldFrameClassName =
	"rounded-md border border-input bg-input/20 dark:bg-input/30";

// Keyboard focus. Text inputs also match :focus-visible on click (browsers
// treat caret focus as visible), so this alone covers them.
export const fieldFocusClassName = "focus-visible:border-ring";

// Popup triggers (Select, pickers): a mouse click on a button never matches
// :focus-visible, so the accent also rides the open state. aria-expanded
// covers base-ui triggers.
export const fieldOpenClassName = "aria-expanded:border-ring";

// Composite fields where a naked inner input carries the caret: the wrapper
// reacts to focus anywhere inside it.
export const fieldFocusWithinClassName = "focus-within:border-ring";

// Invalid fields keep the quiet language with destructive semantics — the
// border carries the state.
export const fieldInvalidClassName =
	"aria-invalid:border-destructive dark:aria-invalid:border-destructive/50";
