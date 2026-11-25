import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/shared/FormFooter";

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
