import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { hostsListQueryOptions, useHosts } from "@/api/hooks/hosts";
import { useCreateModel } from "@/api/hooks/models";
import type { ApiErrorBody } from "@/api/types/errors";
import { ApiError } from "@/api/types/errors";
import type { ModelCreate } from "@/api/types/model";
import { EnabledField } from "@/shared/EnabledField";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";
import type { FieldDef, FormValues } from "@/shared/ResourceForm";
import { ResourceForm } from "@/shared/ResourceForm";
import { toast } from "@/shared/Toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/models/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(hostsListQueryOptions),
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
		name: "displayName",
		label: "Display name",
		type: "text",
		placeholder: "GPT-4o",
	},
	{
		name: "upstreamName",
		label: "Upstream model name",
		type: "text",
		required: true,
		placeholder: "gpt-4o",
	},
];

function NewModelInner() {
	const navigate = useNavigate();
	const createModel = useCreateModel();
	const { data: hostsData } = useHosts();
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [hostId, setHostId] = useState<string>("");
	const [adapter, setAdapter] = useState<string>("openai");
	const [enabled, setEnabled] = useState<boolean>(true);

	const hosts = hostsData.items ?? [];
	const selectedHost = hosts.find((h) => h.metadata.id === hostId);
	const selectedHostLabel = selectedHost && displayLabel(selectedHost.metadata);

	async function handleSubmit(values: FormValues) {
		setServerError(undefined);
		const name = String(values.name ?? "");
		const displayName = String(values.displayName ?? "").trim();
		const upstreamName = String(values.upstreamName ?? "");

		if (!hostId) {
			toast("error", "Pick a host first.");
			return;
		}

		const payload: ModelCreate = {
			metadata: { name, displayName: displayName || undefined },
			spec: {
				enabled,
				hosts: [{ hostId, upstreamName, adapter }],
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
				<div className="space-y-3">
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
							Host
						</div>
						<Select
							value={hostId || undefined}
							onValueChange={(v) => setHostId(v ?? "")}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Pick a host">
									{selectedHostLabel}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{hosts.length === 0 ? (
									<div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
										No hosts configured.
									</div>
								) : (
									hosts.map((h) => (
										<SelectItem key={h.metadata.id} value={h.metadata.id ?? ""}>
											<span className="inline-flex items-center gap-2">
												<HostLogo host={h} size={14} />
												{displayLabel(h.metadata)}
											</span>
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
							Adapter
						</div>
						<Select value={adapter} onValueChange={(v) => setAdapter(v ?? "openai")}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="openai">openai</SelectItem>
								<SelectItem value="anthropic">anthropic</SelectItem>
								<SelectItem value="gemini">gemini</SelectItem>
								<SelectItem value="bedrock">bedrock</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<EnabledField
						value={enabled}
						onChange={setEnabled}
						hint="When off, this model is hidden from policies and rejects requests."
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
