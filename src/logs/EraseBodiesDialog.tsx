import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fmtInt } from "@/lib/format";
import { AlertBanner } from "@/shared/AlertBanner";
import { TypedConfirmField } from "@/shared/TypedConfirmField";
import type { EraseSelection, EraseTarget } from "./eraseScope";
import { useEraseBodies, useEraseScopeOptions } from "./useEraseBodies";

const ANY = "any";

interface EraseBodiesDialogProps {
	/** Set by a project or principal page; the logs page leaves it to pickers. */
	scope?: EraseSelection;
	onClose: () => void;
}

export function EraseBodiesDialog({ scope, onClose }: EraseBodiesDialogProps) {
	const erase = useEraseBodies(scope);

	return (
		<Dialog open onOpenChange={(next) => !next && !erase.erasing && onClose()}>
			<DialogContent className="sm:max-w-md">
				{erase.erased !== null ? (
					<>
						<DialogHeader>
							<DialogTitle>Captured bodies erased</DialogTitle>
							<DialogDescription>
								Erased the bodies of {fmtInt(erase.erased)} captured{" "}
								{erase.erased === 1 ? "request" : "requests"} for{" "}
								{erase.scopeLabel}. Their usage rows are kept.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button type="button" onClick={onClose}>
								Done
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Erase captured bodies</DialogTitle>
							<DialogDescription>
								Permanently deletes the request and response bodies payload
								logging captured
								{erase.scopeLabel ? ` for ${erase.scopeLabel}` : ""}. Usage rows
								(tokens, cost, timing) stay.
							</DialogDescription>
						</DialogHeader>

						{!scope && <ScopePickers erase={erase} />}

						{erase.failure && (
							<AlertBanner severity="error" title={erase.failure.title}>
								<p className="text-xs text-muted-foreground">
									{erase.failure.message}
								</p>
							</AlertBanner>
						)}

						{erase.confirmName && (
							<TypedConfirmField
								expected={erase.confirmName}
								value={erase.typed}
								onChange={erase.setTyped}
								label={
									<>
										Type{" "}
										<code className="font-mono normal-case text-foreground/80">
											{erase.confirmName}
										</code>{" "}
										to confirm
									</>
								}
							/>
						)}

						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								onClick={onClose}
								disabled={erase.erasing}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={erase.submit}
								disabled={!erase.canErase}
							>
								{erase.erasing ? "Erasing…" : "Erase bodies"}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ScopePickers({ erase }: { erase: ReturnType<typeof useEraseBodies> }) {
	const options = useEraseScopeOptions();
	return (
		<div className="flex flex-col gap-3">
			<TargetSelect
				label="Project"
				anyLabel="Any project"
				targets={options.projects}
				value={erase.selection.project}
				onChange={erase.setProject}
			/>
			<TargetSelect
				label="User or service account"
				anyLabel="Any principal"
				targets={options.principals}
				value={erase.selection.principal}
				onChange={erase.setPrincipal}
			/>
			<p className="text-[11px] text-muted-foreground">
				Pick a project, a principal, or both: both erases only that principal's
				bodies in that project.
			</p>
		</div>
	);
}

function TargetSelect({
	label,
	anyLabel,
	targets,
	value,
	onChange,
}: {
	label: string;
	anyLabel: string;
	targets: readonly EraseTarget[];
	value: EraseTarget | undefined;
	onChange: (target?: EraseTarget) => void;
}) {
	const items = [
		{ value: ANY, label: anyLabel },
		...targets.map((t) => ({
			value: t.id,
			label: t.kind === "project" ? t.label : `${t.label} (${t.kind})`,
		})),
	];
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<Select
				value={value?.id ?? ANY}
				items={items}
				onValueChange={(v) => onChange(targets.find((t) => t.id === v))}
			>
				<SelectTrigger className="w-full" aria-label={label}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{items.map((i) => (
						<SelectItem key={i.value} value={i.value}>
							{i.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
