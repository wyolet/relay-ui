import { type ReactNode, useEffect, useState } from "react";

/**
 * A Suspense fallback that appears only once the load outlasts `ms`. A fast
 * load goes straight to its content instead of flashing a placeholder whose
 * layout may not match what arrives (e.g. a traffic skeleton before "no traffic").
 */
export function DelayedFallback({
	ms = 250,
	children,
}: {
	ms?: number;
	children: ReactNode;
}) {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setShown(true), ms);
		return () => clearTimeout(timer);
	}, [ms]);
	return shown ? children : null;
}
