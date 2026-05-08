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
			<h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
				{title}
			</h1>
			<p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
				{question}
			</p>
			<div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-6 py-10 text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
				{plannedFor}
			</div>
		</div>
	);
}
