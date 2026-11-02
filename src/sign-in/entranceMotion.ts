/* Entrance choreography: the card rises once, then its children cascade in a
   short stagger. MotionConfig honors the OS reduced-motion preference. */
export const cascade = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export const rise = {
	hidden: { opacity: 0, y: 10 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
	},
};
