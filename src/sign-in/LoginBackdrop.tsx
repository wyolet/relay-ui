import { motion } from "motion/react";

/** Ambient brand glows breathing behind the card; they swell on success. */
export function LoginBackdrop({ success }: { success: boolean }) {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0">
			<motion.div
				animate={
					success
						? { scale: 1.35, opacity: 1 }
						: { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }
				}
				transition={
					success
						? { duration: 0.8, ease: "easeOut" }
						: { duration: 11, repeat: Infinity, ease: "easeInOut" }
				}
				className="absolute left-1/2 top-0 size-[46rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/10 blur-[120px]"
			/>
			<motion.div
				animate={
					success
						? { scale: 1.3, opacity: 1 }
						: { scale: [1, 1.09, 1], opacity: [0.7, 1, 0.7] }
				}
				transition={
					success
						? { duration: 0.8, ease: "easeOut" }
						: {
								duration: 13,
								repeat: Infinity,
								ease: "easeInOut",
								delay: 2,
							}
				}
				className="absolute bottom-0 right-0 size-[34rem] translate-x-1/4 translate-y-1/4 rounded-full bg-brand-500/10 blur-[120px]"
			/>
			{/* grain dither so the glows blend instead of banding */}
			<div className="bg-grain absolute inset-0 opacity-[0.04] mix-blend-overlay dark:opacity-[0.05]" />
		</div>
	);
}
