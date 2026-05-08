import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	modelDetailQueryOptions,
	useModel,
	useUpdateModel,
} from "#/api/hooks/models";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "#/api/hooks/ratelimits";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { ModelUpdate } from "#/api/types/model";
import type { RateLimitAttachment } from "#/api/types/ratelimit";
import { RateLimitsEditor } from "#/components/RateLimitsEditor";
import type { FieldDef, FormValues } from "#/components/ResourceForm";
import { ResourceForm } from "#/components/ResourceForm";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/models/$name/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: EditModelPage,
});

const FIELDS: FieldDef[] = [
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

function EditModelInner() {
	const { name } = Route.useParams();
	const { data: model } = useModel(name);
	const { data: rateLimitsData } = useRateLimits();
	const updateModel = useUpdateModel(name);
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [rateLimits, setRateLimits] = useState<RateLimitAttachment[]>(
		model.spec.rateLimits ?? [],
	);

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const inputVal = Number(values.input);
		const outputVal = Number(values.output);
		const hasPricing =
			!Number.isNaN(inputVal) &&
			!Number.isNaN(outputVal) &&
			String(values.input).trim() !== "" &&
			String(values.output).trim() !== "";

		const payload: ModelUpdate = {
			metadata: model.metadata,
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
			await updateModel.mutateAsync(payload);
			toast("success", `Model "${name}" updated.`);
			void navigate({ to: "/models/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update model.");
			}
		}
	}

	return (
		<div>
			<ResourceForm
				title={`Edit Model: ${name}`}
				fields={FIELDS}
				initialValues={{
					provider: model.spec.provider,
					upstreamName: model.spec.upstreamName,
					input:
						model.spec.pricing?.rates?.input != null
							? String(model.spec.pricing.rates.input)
							: "",
					output:
						model.spec.pricing?.rates?.output != null
							? String(model.spec.pricing.rates.output)
							: "",
				}}
				onSubmit={handleSubmit}
				onCancel={() =>
					void navigate({ to: "/models/$name", params: { name } })
				}
				isPending={updateModel.isPending}
				serverError={serverError}
				extraContent={
					<RateLimitsEditor
						value={rateLimits}
						onChange={setRateLimits}
						availableRateLimits={(rateLimitsData.items ?? []).map(
							(rl) => rl.metadata.name,
						)}
					/>
				}
			/>
		</div>
	);
}

function EditModelPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<EditModelInner />
		</Suspense>
	);
}
