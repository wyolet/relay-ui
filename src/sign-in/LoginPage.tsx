import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { BrandMark } from "@/shared/BrandMark";
import { cascade, rise } from "@/sign-in/entranceMotion";
import { LiveStatus } from "@/sign-in/LiveStatus";
import { LoginBackdrop } from "@/sign-in/LoginBackdrop";
import { LoginForm } from "@/sign-in/LoginForm";
import { SsoSignIn } from "@/sign-in/SsoSignIn";
import { useLoginForm } from "@/sign-in/useLoginForm";
import { useSignInNotice } from "@/sign-in/useSignInNotice";

export function LoginPage() {
	const { form, serverError, success } = useLoginForm();
	const notice = useSignInNotice();

	return (
		<MotionConfig reducedMotion="user">
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
				<LoginBackdrop success={success} />

				<motion.div
					initial={{ opacity: 0, y: 22, scale: 0.985 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
					className="relative w-full max-w-[27rem] overflow-hidden rounded-3xl border border-border/70 bg-card/95 p-9 shadow-2xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm dark:shadow-black/40 dark:ring-white/5"
				>
					{/* top edge highlight */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
					/>

					<motion.div variants={cascade} initial="hidden" animate="show">
						<motion.div
							variants={rise}
							className="mb-9 flex flex-col items-center text-center"
						>
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{
									duration: 0.55,
									ease: [0.22, 1, 0.36, 1],
									delay: 0.05,
								}}
							>
								<BrandMark className="mb-5 h-9 w-auto" />
							</motion.div>
							<div className="flex items-baseline gap-2">
								<span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
									Wyolet
								</span>
								<span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
									Relay
								</span>
							</div>
							<p className="mt-2.5 text-[13px] text-muted-foreground">
								Sign in to the operator console
							</p>
						</motion.div>

						<AnimatePresence mode="wait" initial={false}>
							{success ? (
								<motion.div
									key="success"
									initial={{ opacity: 0, scale: 0.94 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
									className="grid min-h-[17rem] content-center justify-items-center gap-3"
								>
									<BrandMark className="h-12 w-auto" />
									<p className="text-sm text-muted-foreground">
										You're in — opening the console…
									</p>
								</motion.div>
							) : (
								<motion.div
									key="form"
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.25, ease: "easeOut" }}
								>
									<LoginForm
										form={form}
										serverError={serverError}
										notice={notice}
									/>
									<SsoSignIn />
								</motion.div>
							)}
						</AnimatePresence>

						<motion.div
							variants={rise}
							className="mt-9 border-t border-border/50 pt-6"
						>
							<LiveStatus />
						</motion.div>
					</motion.div>
				</motion.div>
			</div>
		</MotionConfig>
	);
}
