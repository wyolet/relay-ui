import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { rise } from "@/sign-in/entranceMotion";
import { useSsoSignIn } from "@/sign-in/useSsoSignIn";

export function SsoSignIn() {
	const sso = useSsoSignIn();
	if (!sso.enabled) return null;
	return (
		<motion.div variants={rise} className="mt-5 flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<div className="h-px flex-1 bg-border/50" />
				<span className="text-xs text-muted-foreground">or</span>
				<div className="h-px flex-1 bg-border/50" />
			</div>
			<Button
				type="button"
				variant="outline"
				className="h-10 w-full rounded-lg text-sm"
				onClick={sso.start}
			>
				Continue with SSO
			</Button>
		</motion.div>
	);
}
