import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { removeAccountQueries, whoamiQueryOptions } from "./auth";

describe("removeAccountQueries", () => {
	it("drops account data but keeps the whoami probe", () => {
		const qc = new QueryClient();
		qc.setQueryData(whoamiQueryOptions.queryKey, {
			authenticated: false,
			roles: [],
			scopes: [],
		});
		qc.setQueryData(["users"], [{ id: "u1" }]);
		qc.setQueryData(["capabilities", "x"], true);

		removeAccountQueries(qc);

		expect(qc.getQueryData(["users"])).toBeUndefined();
		expect(qc.getQueryData(["capabilities", "x"])).toBeUndefined();
		expect(qc.getQueryData(whoamiQueryOptions.queryKey)).toBeDefined();
	});
});
