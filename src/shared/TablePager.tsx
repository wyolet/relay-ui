import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePagerProps {
	/** 1-based current page. */
	page: number;
	pageSize: number;
	/** Pre-window match count reported by the server. */
	total: number;
	onPage: (page: number) => void;
}

/** Offset-pagination footer for server-windowed tables: a result range
 * ("1–50 of 529") plus prev/next. Hidden entirely when one page fits. */
export function TablePager({ page, pageSize, total, onPage }: TablePagerProps) {
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	if (total <= pageSize) return null;
	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, total);
	return (
		<div className="mt-2 flex items-center justify-between">
			<span className="text-[11px] text-muted-foreground">
				{start}–{end} of {total}
			</span>
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					disabled={page <= 1}
					onClick={() => onPage(page - 1)}
					aria-label="Previous page"
				>
					<ChevronLeft data-icon="inline-start" />
					Prev
				</Button>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{page} / {pageCount}
				</span>
				<Button
					variant="ghost"
					size="sm"
					disabled={page >= pageCount}
					onClick={() => onPage(page + 1)}
					aria-label="Next page"
				>
					Next
					<ChevronRight data-icon="inline-end" />
				</Button>
			</div>
		</div>
	);
}
