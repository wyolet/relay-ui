import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	rateLimitDetailQueryOptions,
	useRateLimit,
	useUpdateRateLimit,
} from "#/api/hooks/ratelimits";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { RateLimitUpdate } from "#/api/types/ratelimit";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/ratelimits/$name/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			rateLimitDetailQueryOptions(params.name),
		),
	component: EditRateLimitPage,
});

const STRATEGY_OPTIONS = [
	{ value: "fixed_window", label: "Fixed Window" },
	{ value: "sliding_window", label: "Sliding Window" },
	{ value: "token_bucket", label: "Token Bucket" },
];

const SOURCE_OPTIONS = [
	{ value: "ip", label: "IP Address" },
	{ value: "api_key", label: "API Key" },
	{ value: "user", label: "User" },
	{ value: "global", label: "Global" },
];

const FIELDS: FieldDef[] = [
	{
		name: "strategy",
		label: "Strategy",
		type: "select",
		required: true,
		options: STRATEGY_OPTIONS,
	},
	{
		name: "window",
		label: "Window (seconds)",
		type: "number",
		required: true,
		placeholder: "60",
	},
	{
		name: "amount",
		label: "Amount (requests/tokens)",
		type: "number",
		required: true,
		placeholder: "100",
	},
	{
		name: "source",
		label: "Source",
		type: "select",
		required: true,
		options: SOURCE_OPTIONS,
	},
];

function EditRateLimitInner() {
	const { name } = Route.useParams();
	const { data: rl } = useRateLimit(name);
	const updateRateLimit = useUpdateRateLimit(name);
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const payload: RateLimitUpdate = {
			metadata: rl.metadata,
			spec: {
				strategy: String(values.strategy ?? "fixed_window"),
				window: Number(values.window),
				amount: Number(values.amount),
				source: String(values.source ?? "global"),
			},
		};
		try {
			await updateRateLimit.mutateAsync(payload);
			toast("success", `Rate limit "${name}" updated.`);
			void navigate({ to: "/ratelimits/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update rate limit.");
			}
		}
	}

	return (
		<ResourceForm
			title={`Edit Rate Limit: ${name}`}
			fields={FIELDS}
			initialValues={{
				strategy: rl.spec.strategy,
				window: String(rl.spec.window),
				amount: String(rl.spec.amount),
				source: rl.spec.source ?? "global",
			}}
			onSubmit={handleSubmit}
			onCancel={() =>
				void navigate({ to: "/ratelimits/$name", params: { name } })
			}
			isPending={updateRateLimit.isPending}
			serverError={serverError}
		/>
	);
}

function EditRateLimitPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<EditRateLimitInner />
		</Suspense>
	);
}
