import { Lock, User } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { firstError } from "@/lib/formErrors";
import { rise } from "@/sign-in/entranceMotion";
import { LoginField } from "@/sign-in/LoginField";
import type { LoginFormState } from "@/sign-in/useLoginForm";

interface LoginFormProps {
	form: LoginFormState["form"];
	serverError: string | null;
	notice: string | undefined;
}

export function LoginForm({ form, serverError, notice }: LoginFormProps) {
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-col gap-4"
			aria-label="Sign in"
		>
			{notice && serverError === null && (
				<motion.div
					variants={rise}
					role="status"
					className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-foreground"
				>
					{notice}
				</motion.div>
			)}

			<motion.div variants={rise}>
				<form.Field name="username">
					{(field) => (
						<LoginField
							id="username"
							label="Username"
							type="text"
							icon={User}
							autoComplete="username"
							value={field.state.value}
							onChange={field.handleChange}
							onBlur={field.handleBlur}
							error={firstError(field.state.meta.errors)}
							disabled={form.state.isSubmitting}
						/>
					)}
				</form.Field>
			</motion.div>

			<motion.div variants={rise}>
				<form.Field name="password">
					{(field) => (
						<LoginField
							id="password"
							label="Password"
							type="password"
							icon={Lock}
							autoComplete="current-password"
							value={field.state.value}
							onChange={field.handleChange}
							onBlur={field.handleBlur}
							error={firstError(field.state.meta.errors)}
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

			<form.Subscribe selector={(s) => [s.isSubmitting, s.canSubmit] as const}>
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
	);
}
