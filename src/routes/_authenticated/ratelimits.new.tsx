import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateRateLimit } from "#/api/hooks/ratelimits";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { RateLimitCreate } from "#/api/types/ratelimit";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/ratelimits/new")({
	component: NewRateLimitPage,
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
		name: "name",
		label: "Name",
		type: "text",
		required: true,
		placeholder: "default-rl",
	},
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

function NewRateLimitPage() {
	const navigate = useNavigate();
	const createRateLimit = useCreateRateLimit();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const name = String(values.name ?? "");
		const payload: RateLimitCreate = {
			metadata: { name },
			spec: {
				strategy: String(values.strategy ?? "fixed_window"),
				window: Number(values.window),
				amount: Number(values.amount),
				source: String(values.source ?? "global"),
			},
		};
		try {
			await createRateLimit.mutateAsync(payload);
			toast("success", `Rate limit "${name}" created.`);
			void navigate({
				to: "/ratelimits/$name",
				params: { name },
			});
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create rate limit.");
			}
		}
	}

	return (
		<ResourceForm
			title="New Rate Limit"
			fields={FIELDS}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/ratelimits" })}
			isPending={createRateLimit.isPending}
			serverError={serverError}
		/>
	);
}
