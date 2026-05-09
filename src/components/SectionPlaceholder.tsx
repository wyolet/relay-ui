interface SectionPlaceholderProps {
	title: string;
	question: string;
	plannedFor: string;
}

export function SectionPlaceholder({
	title,
	question,
	plannedFor,
}: SectionPlaceholderProps) {
	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-2">
				{title}
			</h1>
			<p className="text-sm text-muted-foreground mb-8">
				{question}
			</p>
			<div className="rounded-lg border border-dashed border-input bg-neutral-50 dark:bg-neutral-900 px-6 py-10 text-sm text-muted-foreground max-w-2xl">
				{plannedFor}
			</div>
		</div>
	);
}
