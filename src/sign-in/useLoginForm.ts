import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthError, useAuth } from "@/api/auth";
import { zodFieldValidator } from "@/lib/formErrors";

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

export function useLoginForm() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [serverError, setServerError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const form = useForm({
		defaultValues: { username: "", password: "" } as LoginValues,
		validators: { onSubmit: zodFieldValidator<LoginValues>(loginSchema) },
		onSubmit: async ({ value }) => {
			setServerError(null);
			try {
				await login(value.username, value.password);
				// Let the send-off play before the route swap — signing in should
				// feel like crossing a threshold, not a teleport.
				setSuccess(true);
				await new Promise((resolve) => setTimeout(resolve, 700));
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

	return { form, serverError, success };
}

export type LoginFormState = ReturnType<typeof useLoginForm>;
