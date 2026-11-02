export function PickerListEmpty({ label }: { label: string }) {
	return (
		<div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
			{label}
		</div>
	);
}
