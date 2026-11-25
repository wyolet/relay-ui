/** A field's inline error; `id` is what the field's `aria-describedby` names. */
export function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} className="mt-1.5 text-[11px] text-destructive">
			{message}
		</p>
	);
}
