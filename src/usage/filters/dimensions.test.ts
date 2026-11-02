import { describe, expect, test } from "bun:test";
import { dimensionFilter } from "./dimensions";

const NONE = {
	model_id: [],
	host_id: [],
	team_id: [],
	project_id: [],
	principal_id: [],
	lane_account_id: [],
	relay_key_hash: [],
	policy_id: [],
	host_key_id: [],
	refusal: [],
};

describe("dimensionFilter", () => {
	test("keeps chosen dimensions and leaves empty ones out", () => {
		expect(
			dimensionFilter({
				...NONE,
				lane_account_id: ["acc-1"],
				refusal: ["no_capacity"],
			}),
		).toEqual({ lane_account_id: ["acc-1"], refusal: ["no_capacity"] });
	});

	test("drops refusal values the relay doesn't send", () => {
		expect(
			dimensionFilter({ ...NONE, model_id: ["m1"], refusal: ["made_up"] }),
		).toEqual({ model_id: ["m1"] });
	});
});
