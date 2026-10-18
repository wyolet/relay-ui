import { describe, expect, test } from "bun:test";
import { resolveWindow } from "@/api/hooks/usage";
import { dailyValues } from "./useWeekActivity";

describe("dailyValues", () => {
	test("puts each UTC day bucket on its local day of this week", () => {
		const monday = new Date(resolveWindow("week").from);
		const utcDay = (offset: number) =>
			new Date(
				Date.UTC(
					monday.getFullYear(),
					monday.getMonth(),
					monday.getDate() + offset,
				),
			).toISOString();
		const values = dailyValues([
			{ bucket: utcDay(0), value: 3 },
			{ bucket: utcDay(1), value: 5 },
		]);
		expect(values).toHaveLength(7);
		expect(values[0]).toBe(3);
		expect(values[1] === 5 || values[1] === null).toBe(true);
	});
});
