import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	hostKeyDetailQueryOptions,
	useHostKey,
	useUpdateHostKey,
} from "@/api/hooks/hostkeys";
import type { ApiErrorBody } from "@/api/types/errors";
import { ApiError } from "@/api/types/errors";
import type { HostKeyKind, HostKeyUpdate } from "@/api/types/hostkey";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/host-keys/$name/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			hostKeyDetailQueryOptions(params.name),
		),
	component: EditHostKeyPage,
});

function EditHostKeyInner() {
	const { name } = Route.useParams();
	const { data: hk } = useHostKey(name);
	const updateHostKey = useUpdateHostKey(hk.metadata.id ?? "");
	const navigate = useNavigate();

	const [kind, setKind] = useState<HostKeyKind>(
		hk.spec.valueFrom.kind === "stored" ? "stored" : "env",
	);
	const [envVar, setEnvVar] = useState(hk.spec.valueFrom.env ?? "");
	const [storedValue, setStoredValue] = useState("");
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitted, setSubmitted] = useState(false);

	function validate() {
		const errs: Record<string, string> = {};
		if (kind === "env" && !envVar.trim())
			errs.envVar = "Environment variable name is required.";
		if (kind === "stored" && !storedValue.trim())
			errs.storedValue = "Secret value is required.";
		return errs;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitted(true);
		const errs = validate();
		setFieldErrors(errs);
		if (Object.keys(errs).length > 0) return;

		setServerError(undefined);
		const payload: HostKeyUpdate = {
			metadata: hk.metadata,
			spec:
				kind === "env"
					? {
							...hk.spec,
							valueFrom: { kind: "env", env: envVar.trim() },
						}
					: {
							...hk.spec,
							valueFrom: { kind: "stored" },
							value: storedValue,
						},
		};
		try {
			await updateHostKey.mutateAsync(payload);
			toast("success", `Host key "${name}" updated.`);
			void navigate({ to: "/host-keys/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update host key.");
			}
		}
	}

	const errs = submitted ? validate() : fieldErrors;

	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-6">
				Edit Host Key: <span className="font-mono">{name}</span>
			</h1>

			{serverError && (
				<div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
					<p className="font-medium">{serverError.message}</p>
				</div>
			)}

			<form
				onSubmit={(e) => void handleSubmit(e)}
				noValidate
				className="space-y-5 max-w-xl"
			>
				<div>
					<span className="block text-sm font-medium text-foreground mb-2">
						Mode
					</span>
					<div className="flex gap-2">
						{(["stored", "env"] as const).map((k) => (
							<button
								key={k}
								type="button"
								onClick={() => setKind(k)}
								className={[
									"px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
									kind === k
										? "bg-brand-600 text-white border-brand-600"
										: "bg-card text-foreground border-input hover:bg-neutral-50 dark:hover:bg-neutral-800",
								].join(" ")}
							>
								{k === "stored" ? "Stored value" : "Env var"}
							</button>
						))}
					</div>
				</div>

				{kind === "env" && (
					<div>
						<label
							htmlFor="env_var"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Environment variable name{" "}
							<span className="ml-1 text-red-500" aria-hidden="true">
								*
							</span>
						</label>
						<input
							id="env_var"
							type="text"
							value={envVar}
							onChange={(e) => setEnvVar(e.target.value)}
							placeholder="OPENAI_API_KEY"
							className="w-full border border-input rounded-lg px-3 py-2 text-sm font-mono bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
						/>
						<p className="mt-1 text-xs text-muted-foreground">
							Set this env var on your relay deployment.
						</p>
						{errs.envVar && (
							<p role="alert" className="mt-1 text-xs text-destructive">
								{errs.envVar}
							</p>
						)}
					</div>
				)}

				{kind === "stored" && (
					<div>
						<label
							htmlFor="stored_value"
							className="block text-sm font-medium text-foreground mb-1"
						>
							New secret value{" "}
							<span className="ml-1 text-red-500" aria-hidden="true">
								*
							</span>
						</label>
						<input
							id="stored_value"
							type="password"
							autoComplete="new-password"
							value={storedValue}
							onChange={(e) => setStoredValue(e.target.value)}
							placeholder="Enter new value"
							className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
						/>
						{errs.storedValue && (
							<p role="alert" className="mt-1 text-xs text-destructive">
								{errs.storedValue}
							</p>
						)}
					</div>
				)}

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={updateHostKey.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
					>
						{updateHostKey.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						disabled={updateHostKey.isPending}
						onClick={() =>
							void navigate({ to: "/host-keys/$name", params: { name } })
						}
						className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

function EditHostKeyPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<EditHostKeyInner />
		</Suspense>
	);
}
