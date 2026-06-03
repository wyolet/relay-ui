import { cn } from "@/lib/utils";

/**
 * Wyolet Relay mark — three forward bars; the top one is a flag (cap + leg
 * merged into one path so the cap and rightmost bar read as a single shape).
 * Authored upright then sheared 45° so weights/gaps stay balanced.
 *
 * The gradient is `userSpaceOnUse` (not per-path) so it flows continuously
 * across the whole mark, and theme-aware: deeper/expressive on light so it does
 * not blend into white, airy on dark. Stops read from `--mk-from` / `--mk-to`,
 * set per theme via Tailwind's `dark:` variant.
 *
 * `BARS` is the single source of truth, shared with `public/favicon.svg`.
 */

const BARS = [
	"M168 168 L236 168 L368 300 L300 300 Z",
	"M250 110 L318 110 L508 300 L440 300 Z",
	"M164 24 L372 24 L504 156 L436 156 L348 68 L208 68 Z",
];
const VIEWBOX = "156 16 360 292";
const GRAD_ID = "wyolet-mark-grad";

export function BrandMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox={VIEWBOX}
			className={cn(
				"[--mk-from:#9b7cf6] [--mk-to:#7c3aed] dark:[--mk-from:#e9e2ff] dark:[--mk-to:#bfa9fb]",
				className,
			)}
			role="img"
			aria-label="Wyolet Relay"
		>
			<title>Wyolet Relay</title>
			<defs>
				<linearGradient
					id={GRAD_ID}
					gradientUnits="userSpaceOnUse"
					x1="156"
					y1="16"
					x2="516"
					y2="308"
				>
					<stop offset="0" stopColor="var(--mk-from)" />
					<stop offset="1" stopColor="var(--mk-to)" />
				</linearGradient>
			</defs>
			{BARS.map((d) => (
				<path key={d} d={d} fill={`url(#${GRAD_ID})`} />
			))}
		</svg>
	);
}
