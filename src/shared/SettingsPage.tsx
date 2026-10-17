import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** The back link, title and lede every /settings/* page opens with. */
export function SettingsPageHeader({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div>
			<Link
				to="/settings"
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Settings
			</Link>
			<h1 className="mt-2 text-xl font-semibold text-foreground">{title}</h1>
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
		<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
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
		</div>
	);
}
