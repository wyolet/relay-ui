import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	modelDetailQueryOptions,
	useModel,
	useUpdateModel,
} from "@/api/hooks/models";
import type { ApiErrorBody } from "@/api/types/errors";
import { ApiError } from "@/api/types/errors";
import type { ModelUpdate } from "@/api/types/model";
import type { FieldDef, FormValues } from "@/shared/ResourceForm";
import { ResourceForm } from "@/shared/ResourceForm";
import { toast } from "@/shared/Toast";

export const Route = createFileRoute("/_authenticated/models/$name/edit")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(modelDetailQueryOptions(params.name)),
	component: EditModelPage,
});

const FIELDS: FieldDef[] = [
	{
		name: "displayName",
		label: "Display name",
		type: "text",
		placeholder: "GPT-4o",
	},
	{
		name: "family",
		label: "Family",
		type: "text",
		placeholder: "gpt-4",
	},
	{
		name: "version",
		label: "Version",
		type: "text",
		placeholder: "2024-08",
	},
	{
		name: "tags",
		label: "Tags (comma-separated)",
		type: "text",
		placeholder: "preview, recommended",
	},
];

function splitCsv(v: string | undefined): string[] | null {
	const parts = (v ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : null;
}

function EditModelInner() {
	const { name } = Route.useParams();
	const { data: model } = useModel(name);
	const updateModel = useUpdateModel(model.metadata.id ?? "");
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const payload: ModelUpdate = {
			metadata: {
				...model.metadata,
				displayName: String(values.displayName ?? "").trim() || undefined,
			},
			spec: {
				...model.spec,
				family: String(values.family ?? "").trim() || undefined,
				version: String(values.version ?? "").trim() || undefined,
				tags: splitCsv(String(values.tags ?? "")),
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
					displayName: model.metadata.displayName ?? "",
					family: model.spec.family ?? "",
					version: model.spec.version ?? "",
					tags: (model.spec.tags ?? []).join(", "),
				}}
				onSubmit={handleSubmit}
				onCancel={() =>
					void navigate({ to: "/models/$name", params: { name } })
				}
				isPending={updateModel.isPending}
				serverError={serverError}
			/>
		</div>
	);
}

function EditModelPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<EditModelInner />
		</Suspense>
	);
}
