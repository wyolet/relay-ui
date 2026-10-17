import { describe, expect, test } from "bun:test";
import { reservedEnvPrefix } from "./reservedEnv";

describe("reservedEnvPrefix", () => {
	test("flags relay's own prefixes in any case", () => {
		expect(reservedEnvPrefix("RELAY_MASTER_KEY")).toBe("RELAY_");
		expect(reservedEnvPrefix("relay_openai")).toBe("RELAY_");
		expect(reservedEnvPrefix("  Wyolet_Token")).toBe("WYOLET_");
	});

	test("passes other names, including near misses", () => {
		for (const name of ["OPENAI_API_KEY", "RELAYKEY", "MY_RELAY_KEY", ""]) {
			expect(reservedEnvPrefix(name)).toBeUndefined();
		}
	});
});
