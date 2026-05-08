import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthError, useAuth, whoamiQueryOptions } from "#/api/auth";
import { healthzQueryOptions } from "#/api/queries/dashboard";

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

function BrandMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label="Wyolet"
		>
			<title>Wyolet</title>
			<path
				d="M4 26 L12 6 L16 16 L20 6 L28 26"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function LiveStatus() {
	const { data, isError } = useQuery({
		...healthzQueryOptions,
		retry: false,
	});
	const overall =
		data?.catalog?.status ??
		data?.state?.status ??
		(isError ? "error" : undefined);
	const tone =
		overall === "ok"
			? "text-brand-600 dark:text-brand-400"
			: overall === "degraded"
				? "text-amber-600 dark:text-amber-400"
				: overall === "error"
					? "text-red-600 dark:text-red-400"
					: "text-neutral-400 dark:text-neutral-600";
	const label =
		overall === "ok"
			? "alive"
			: overall === "degraded"
				? "degraded"
				: overall === "error"
					? "unreachable"
					: "checking…";
	return (
		<div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500 tabular-nums">
			<span className={`w-1.5 h-1.5 rounded-full bg-current ${tone}`} />
			<span>relay</span>
			<span aria-hidden="true">·</span>
			<span className={tone}>{label}</span>
		</div>
	);
}

interface FieldRowProps {
	id: string;
	label: string;
	type: "text" | "password";
	autoComplete: string;
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
	value,
	onChange,
	onBlur,
	errors,
	disabled,
}: FieldRowProps) {
	const hasError = errors.length > 0;
	return (
		<div>
			<label
				htmlFor={id}
				className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5"
			>
				{label}
			</label>
			<input
				id={id}
				type={type}
				autoComplete={autoComplete}
				required
				disabled={disabled}
				value={value}
				onChange={(e) => onChange(e.currentTarget.value)}
				onBlur={onBlur}
				aria-invalid={hasError || undefined}
				aria-describedby={hasError ? `${id}-error` : undefined}
				className={[
					"w-full rounded-md px-3 py-2.5 text-sm transition-shadow",
					"text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900",
					"placeholder-neutral-400 dark:placeholder-neutral-500",
					"border focus:outline-none focus:ring-2 focus:border-transparent",
					hasError
						? "border-red-400 dark:border-red-700 focus:ring-red-500"
						: "border-neutral-300 dark:border-neutral-700 focus:ring-brand-500",
					disabled ? "opacity-60 cursor-not-allowed" : "",
				].join(" ")}
			/>
			{hasError && (
				<p
					id={`${id}-error`}
					role="alert"
					className="text-xs text-red-600 dark:text-red-400 mt-1.5"
				>
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
				// TODO: backend currently authenticates via a single token.
				// We send `password` until the backend supports user accounts.
				await login(value.password);
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
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<div className="flex flex-col items-center mb-10">
					<BrandMark className="w-9 h-9 text-brand-600 dark:text-brand-400 mb-4" />
					<div className="flex items-baseline gap-2">
						<span className="text-sm font-medium tracking-[0.2em] text-neutral-400 dark:text-neutral-500 uppercase">
							Wyolet
						</span>
						<span className="text-sm font-semibold tracking-[0.2em] text-neutral-900 dark:text-neutral-100 uppercase">
							Relay
						</span>
					</div>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="space-y-4"
					aria-label="Sign in"
				>
					<h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
						Sign in
					</h1>

					<form.Field name="username">
						{(field) => (
							<FieldRow
								id="username"
								label="Username"
								type="text"
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
						<p
							role="alert"
							className="text-xs text-red-600 dark:text-red-400"
						>
							{serverError}
						</p>
					)}

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<button
								type="submit"
								disabled={isSubmitting || !canSubmit}
								className="w-full rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-neutral-50 dark:focus:ring-offset-neutral-950"
							>
								{isSubmitting ? "Signing in…" : "Sign in"}
							</button>
						)}
					</form.Subscribe>
				</form>

				<div className="mt-10">
					<LiveStatus />
				</div>
			</div>
		</div>
	);
}
