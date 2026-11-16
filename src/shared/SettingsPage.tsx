import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/shared/FormFooter";

/** The title and lede every /settings/* page opens with; the section list beside it is the way back. */
export function SettingsPageHeader({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div>
			<h1 className="text-xl font-semibold text-foreground">{title}</h1>
			<p className="mt-1 text-xs text-muted-foreground max-w-2xl">{children}</p>
		</div>
	);
}

/** The sticky Reset / Save changes footer of an editable settings page. */
export function SettingsSaveBar({
	onReset,
	onSave,
	saving,
}: {
	onReset: () => void;
	onSave: () => void;
	saving: boolean;
}) {
	return (
		<StickyFooter>
			<Button type="button" variant="outline" size="lg" onClick={onReset}>
				Reset
			</Button>
			<Button
				type="button"
				variant="cta"
				size="lg"
				onClick={onSave}
				disabled={saving}
			>
				{saving ? "Saving…" : "Save changes"}
			</Button>
		</StickyFooter>
	);
}
