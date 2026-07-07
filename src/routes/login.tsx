import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { useState } from "react";
import { z } from "zod";
import { AuthError, useAuth, whoamiQueryOptions } from "@/api/auth";
import { CONTROL_API_URL } from "@/api/client";
import { feature } from "@/api/runtimeConfig";
import { Button } from "@/components/ui/button";
import {
	fieldFocusWithinClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/shared/BrandMark";

export const Route = createFileRoute("/login")({
	async beforeLoad({ context }) {
		const whoami =
			await context.queryClient.ensureQueryData(whoamiQueryOptions);
		if (whoami.authenticated) throw redirect({ to: "/" });
	},
	component: LoginPage,
});

const loginSchema = z.object({
	username: z
		.string()
		.trim()
		.min(1, "Username is required")
		.max(64, "Username is too long"),
	password: z
		.string()
		.min(1, "Password is required")
		.max(512, "Password is too long"),
});

type LoginValues = z.infer<typeof loginSchema>;

/* Entrance choreography: the card rises once, then its children cascade in a
   short stagger. MotionConfig honors the OS reduced-motion preference. */
const cascade = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const rise = {
	hidden: { opacity: 0, y: 10 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
	},
};

function LiveStatus() {
	const { data, isError, isLoading } = useQuery({
		...whoamiQueryOptions,
		retry: false,
		refetchInterval: 5_000,
	});
	const reachable = !isLoading && !isError && data !== undefined;
	const state = reachable ? "alive" : isError ? "unreachable" : "checking";
	const tone =
		state === "alive"
			? "text-brand-600 dark:text-brand-400"
			: state === "unreachable"
				? "text-destructive"
				: "text-muted-foreground";
	const label =
		state === "alive"
			? "Relay online"
			: state === "unreachable"
				? "Relay unreachable"
				: "Connecting…";
	return (
		<div className="flex items-center justify-center">
			<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 py-1 pl-2 pr-3 text-xs font-medium text-muted-foreground">
				<span className="relative flex size-2 items-center justify-center">
					{state === "alive" && (
						<span className="absolute inline-flex size-2 animate-ping rounded-full bg-current opacity-60" />
					)}
					<span className={`relative size-2 rounded-full bg-current ${tone}`} />
				</span>
				<span className={tone}>{label}</span>
			</div>
		</div>
	);
}

interface FieldRowProps {
	id: string;
	label: string;
	type: "text" | "password";
	autoComplete: string;
	icon: typeof User;
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
	errors: readonly string[];
	disabled: boolean;
}

/** Login field on the shared field system: the wrapper carries the mauve
 *  frame + focus-within wash/settle, the inner input stays naked. */
function FieldRow({
	id,
	label,
	type,
	autoComplete,
	icon: Icon,
	value,
	onChange,
	onBlur,
	errors,
	disabled,
}: FieldRowProps) {
	const hasError = errors.length > 0;
	const isPassword = type === "password";
	const [reveal, setReveal] = useState(false);
	const inputType = isPassword && reveal ? "text" : type;
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<div
				className={cn(
					fieldFrameClassName,
					fieldFocusWithinClassName,
					"flex h-11 items-center gap-2.5 px-3 transition-[border-color,background-color]",
					hasError && "border-destructive",
				)}
			>
				<Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
				<input
					id={id}
					type={inputType}
					autoComplete={autoComplete}
					required
					disabled={disabled}
					value={value}
					onChange={(e) => onChange(e.currentTarget.value)}
					onBlur={onBlur}
					aria-invalid={hasError || undefined}
					aria-describedby={hasError ? `${id}-error` : undefined}
					className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
				/>
				{isPassword && (
					<IconButton
						icon={reveal ? EyeOff : Eye}
						label={reveal ? "Hide password" : "Show password"}
						weight="bare"
						size="sm"
						tabIndex={-1}
						onClick={() => setReveal((v) => !v)}
						disabled={disabled}
					/>
				)}
			</div>
			{hasError && (
				<p id={`${id}-error`} role="alert" className="text-xs text-destructive">
					{errors[0]}
				</p>
			)}
		</div>
	);
}

function LoginPage() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { username: "", password: "" } as LoginValues,
		validators: {
			onSubmit: ({ value }) => {
				const result = loginSchema.safeParse(value);
				if (result.success) return undefined;
				const fieldErrors: Record<string, string> = {};
				for (const issue of result.error.issues) {
					const path = issue.path[0];
					if (typeof path === "string" && !fieldErrors[path]) {
						fieldErrors[path] = issue.message;
					}
				}
				return { fields: fieldErrors };
			},
		},
		onSubmit: async ({ value }) => {
			setServerError(null);
			try {
				await login(value.username, value.password);
				await navigate({ to: "/" });
			} catch (err) {
				if (err instanceof AuthError) {
					setServerError(err.message);
				} else {
					setServerError("An unexpected error occurred. Please try again.");
				}
			}
		},
	});

	return (
		<MotionConfig reducedMotion="user">
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
				{/* ambient brand glows — breathing slowly behind the card */}
				<div aria-hidden className="pointer-events-none absolute inset-0">
					<motion.div
						animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
						transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
						className="absolute left-1/2 top-0 size-[46rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/10 blur-[120px]"
					/>
					<motion.div
						animate={{ scale: [1, 1.09, 1], opacity: [0.7, 1, 0.7] }}
						transition={{
							duration: 13,
							repeat: Infinity,
							ease: "easeInOut",
							delay: 2,
						}}
						className="absolute bottom-0 right-0 size-[34rem] translate-x-1/4 translate-y-1/4 rounded-full bg-accent-500/10 blur-[120px]"
					/>
				</div>

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

						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void form.handleSubmit();
							}}
							className="flex flex-col gap-4"
							aria-label="Sign in"
						>
							<motion.div variants={rise}>
								<form.Field name="username">
									{(field) => (
										<FieldRow
											id="username"
											label="Username"
											type="text"
											icon={User}
											autoComplete="username"
											value={field.state.value}
											onChange={field.handleChange}
											onBlur={field.handleBlur}
											errors={field.state.meta.errors
												.filter((e): e is string => typeof e === "string")
												.slice(0, 1)}
											disabled={form.state.isSubmitting}
										/>
									)}
								</form.Field>
							</motion.div>

							<motion.div variants={rise}>
								<form.Field name="password">
									{(field) => (
										<FieldRow
											id="password"
											label="Password"
											type="password"
											icon={Lock}
											autoComplete="current-password"
											value={field.state.value}
											onChange={field.handleChange}
											onBlur={field.handleBlur}
											errors={field.state.meta.errors
												.filter((e): e is string => typeof e === "string")
												.slice(0, 1)}
											disabled={form.state.isSubmitting}
										/>
									)}
								</form.Field>
							</motion.div>

							{serverError !== null && (
								<motion.div
									key={serverError}
									initial={{ opacity: 0, y: -6 }}
									animate={{ opacity: 1, y: 0, x: [0, -5, 5, -3, 0] }}
									transition={{ duration: 0.4, ease: "easeOut" }}
									role="alert"
									className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
								>
									{serverError}
								</motion.div>
							)}

							<form.Subscribe
								selector={(s) => [s.isSubmitting, s.canSubmit] as const}
							>
								{([isSubmitting, canSubmit]) => (
									<motion.div variants={rise}>
										<Button
											type="submit"
											variant="cta"
											disabled={isSubmitting || !canSubmit}
											className="mt-2 h-10 w-full rounded-lg text-sm"
										>
											{isSubmitting ? "Signing in…" : "Sign in"}
										</Button>
									</motion.div>
								)}
							</form.Subscribe>
						</form>

						{feature("oidc") && (
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
									onClick={() => {
										window.location.assign(
											`${CONTROL_API_URL}/auth/oidc/start`,
										);
									}}
								>
									Continue with SSO
								</Button>
							</motion.div>
						)}

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
