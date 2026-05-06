import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthError, useAuth, whoamiQueryOptions } from "#/api/auth";

export const Route = createFileRoute("/login")({
	async beforeLoad({ context }) {
		const whoami =
			await context.queryClient.ensureQueryData(whoamiQueryOptions);
		if (whoami.authenticated) throw redirect({ to: "/" });
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [token, setToken] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setPending(true);
		try {
			await login(token);
			await navigate({ to: "/" });
		} catch (err) {
			if (err instanceof AuthError) {
				setError(err.message);
			} else {
				setError("An unexpected error occurred. Please try again.");
			}
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
			<div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg dark:shadow-black/40 p-10 w-full max-w-sm">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">
					Relay Admin
				</h1>
				<p className="text-sm text-gray-500 dark:text-zinc-400 mb-8">
					Sign in to continue
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="token"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							Admin token
						</label>
						<input
							id="token"
							type="password"
							autoComplete="current-password"
							required
							value={token}
							onChange={(e) => setToken(e.currentTarget.value)}
							className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							placeholder="••••••••"
						/>
					</div>

					{error !== null && (
						<p role="alert" className="text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={pending}
						className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{pending ? "Signing in…" : "Sign In"}
					</button>
				</form>
			</div>
		</div>
	);
}
