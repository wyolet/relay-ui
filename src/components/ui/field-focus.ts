// The one focus treatment for field-shaped controls — "wash + settle":
// accent border + a mauve wash fill (--input-wash) + a soft halo that
// collapses on arrival (animate-input-settle in globals.css). No standing
// ring. The accent is the chroma-boosted app mauve (--field-accent), not the
// near-neutral semantic --primary — a wash needs real chroma to read as color.
// Compose these constants instead of hand-rolling focus classes so every
// field in the app stays in lockstep.

// The resting field frame — accent-tinted border and fill (never the neutral
// --input gray, which reads brown/gray and denies the palette).
// Composite fields (chip wrappers, search boxes) use this so they sit on
// exactly the same ground as a plain Input.
export const fieldFrameClassName =
	"rounded-md border border-field-border bg-field-rest";

// Keyboard focus. Text inputs also match :focus-visible on click (browsers
// treat caret focus as visible), so this alone covers them.
export const fieldFocusClassName =
	"focus-visible:border-field-accent focus-visible:bg-input-wash dark:focus-visible:bg-input-wash focus-visible:animate-input-settle motion-reduce:animate-none";

// Popup triggers (Select, pickers): a mouse click on a button never matches
// :focus-visible, so the wash also rides the open state. aria-expanded covers
// base-ui triggers.
export const fieldOpenClassName =
	"aria-expanded:border-field-accent aria-expanded:bg-input-wash dark:aria-expanded:bg-input-wash aria-expanded:animate-input-settle";

// Composite fields where a naked inner input carries the caret: the wrapper
// reacts to focus anywhere inside it.
export const fieldFocusWithinClassName =
	"focus-within:border-field-accent focus-within:bg-input-wash dark:focus-within:bg-input-wash focus-within:animate-input-settle motion-reduce:animate-none";

// Invalid fields keep the quiet language with destructive semantics — the
// border carries the state; focus washes in destructive tint instead.
export const fieldInvalidClassName =
	"aria-invalid:border-destructive aria-invalid:focus-visible:bg-destructive/10 dark:aria-invalid:border-destructive/50";
