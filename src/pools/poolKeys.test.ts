import { expect, test } from "bun:test";
import { POOL_SELECTIONS, SELECTION_LABELS } from "@/pools/poolKeys";

test("every selection has a label", () => {
	for (const s of POOL_SELECTIONS)
		expect(SELECTION_LABELS[s].label).toBeTruthy();
});
