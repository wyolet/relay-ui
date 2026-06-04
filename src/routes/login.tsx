import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { z } from "zod";
import { AuthError, useAuth, whoamiQueryOptions } from "@/api/auth";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { wizardPrimary } from "@/setup/ui";
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
			<InputGroup className="h-11">
				<InputGroupAddon>
					<Icon className="text-muted-foreground/70" />
				</InputGroupAddon>
				<InputGroupInput
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
					className="text-sm"
				/>
				{isPassword && (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							size="icon-sm"
							tabIndex={-1}
							onClick={() => setReveal((v) => !v)}
							disabled={disabled}
							aria-label={reveal ? "Hide password" : "Show password"}
						>
							{reveal ? <EyeOff /> : <Eye />}
						</InputGroupButton>
					</InputGroupAddon>
				)}
			</InputGroup>
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
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
			{/* ambient brand glows behind the card */}
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-0 size-[42rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/10 blur-[120px]" />
				<div className="absolute bottom-0 right-0 size-[32rem] translate-x-1/4 translate-y-1/4 rounded-full bg-accent-500/10 blur-[120px]" />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, ease: "easeOut" }}
				className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/70 bg-card/95 p-8 shadow-2xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm dark:shadow-black/40 dark:ring-white/5"
			>
				{/* top edge highlight */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent"
				/>
				<div className="mb-8 flex flex-col items-center text-center">
					<BrandMark className="mb-5 h-9 w-auto" />
					<div className="flex items-baseline gap-2">
						<span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
							Wyolet
						</span>
						<span className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
							Relay
						</span>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						Sign in to the operator console
					</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="flex flex-col gap-4"
					aria-label="Sign in"
				>
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

					{serverError !== null && (
						<p role="alert" className="text-xs text-destructive">
							{serverError}
						</p>
					)}

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<Button
								type="submit"
								disabled={isSubmitting || !canSubmit}
								className={`${wizardPrimary} mt-2 w-full`}
							>
								{isSubmitting ? "Signing in…" : "Sign in"}
							</Button>
						)}
					</form.Subscribe>
				</form>

				<div className="mt-8 border-t border-border/50 pt-6">
					<LiveStatus />
				</div>
			</motion.div>
		</div>
	);
}
