import { FigureRow } from "@/shared/FigureRow";
import { useHeadline } from "./useHeadline";

export function Headline() {
	return <FigureRow figures={useHeadline()} />;
}
