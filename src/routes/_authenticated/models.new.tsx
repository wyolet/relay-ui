import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useCreateModel } from "@/api/hooks/models";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "@/api/hooks/ratelimits";
import type { ApiErrorBody } from "@/api/types/errors";
import { ApiError } from "@/api/types/errors";
import type { ModelCreate } from "@/api/types/model";
import type { RateLimitAttachment } from "@/api/types/ratelimit";
import { MultiSelect } from "@/components/MultiSelect";
import type { FieldDef, FormValues } from "@/components/ResourceForm";
import { ResourceForm } from "@/components/ResourceForm";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/models/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
	component: NewModelPage,
});

const FIELDS: FieldDef[] = [
	{
		name: "name",
		label: "Name",
		type: "text",
		required: true,
		placeholder: "gpt-4o",
	},
	{
		name: "provider",
		label: "Provider name",
		type: "text",
		required: true,
		placeholder: "my-provider",
	},
	{
		name: "upstreamName",
		label: "Upstream model name",
		type: "text",
		required: true,
		placeholder: "gpt-4o",
	},
	{
		name: "input",
		label: "Input cost per 1M tokens (USD)",
		type: "number",
		placeholder: "2.50",
	},
	{
		name: "output",
		label: "Output cost per 1M tokens (USD)",
		type: "number",
		placeholder: "10.00",
	},
];

function NewModelInner() {
	const navigate = useNavigate();
	const createModel = useCreateModel();
	const { data: rateLimitsData } = useRateLimits();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [rateLimits, setRateLimits] = useState<RateLimitAttachment[]>([]);

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const inputVal = Number(values.input);
		const outputVal = Number(values.output);
		const hasPricing =
			!Number.isNaN(inputVal) &&
			!Number.isNaN(outputVal) &&
			String(values.input).trim() !== "" &&
			String(values.output).trim() !== "";

		const name = String(values.name ?? "");
		const payload: ModelCreate = {
			metadata: { name },
			spec: {
				provider: String(values.provider ?? ""),
				upstreamName: String(values.upstreamName ?? ""),
				pricing: hasPricing
					? {
							currency: "USD",
							unit: "1M",
							rates: { input: inputVal, output: outputVal },
						}
					: undefined,
				rateLimits: rateLimits.length > 0 ? rateLimits : undefined,
			},
		};
		try {
			await createModel.mutateAsync(payload);
			toast("success", `Model "${name}" created.`);
			void navigate({ to: "/models/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create model.");
			}
		}
	}

	return (
		<ResourceForm
			title="New Model"
			fields={FIELDS}
			onSubmit={handleSubmit}
			onCancel={() => void navigate({ to: "/models" })}
			isPending={createModel.isPending}
			serverError={serverError}
			extraContent={
				<div>
					<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
						Rate limits
					</div>
					<MultiSelect
						options={(rateLimitsData.items ?? []).map((rl) => ({
							value: rl.metadata.name,
							label: rl.metadata.name,
						}))}
						selected={rateLimits.map((rl) => rl.Ref)}
						onChange={(next) => setRateLimits(next.map((Ref) => ({ Ref })))}
						placeholder="Attach rate limits…"
						emptyHint="No rate limits defined."
						aria-label="Rate limits"
					/>
				</div>
			}
		/>
	);
}

function NewModelPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<NewModelInner />
		</Suspense>
	);
}
