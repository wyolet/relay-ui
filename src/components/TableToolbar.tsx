interface TableToolbarProps {
	search?: React.ReactNode;
	filters?: React.ReactNode;
	actions?: React.ReactNode;
}

export function TableToolbar({ search, filters, actions }: TableToolbarProps) {
	return (
		<div className="flex items-center justify-between gap-3 mb-3">
			<div className="flex items-center gap-2 min-w-0">{search}</div>
			<div className="flex items-center gap-2 shrink-0">
				{filters}
				{actions}
			</div>
		</div>
	);
}
