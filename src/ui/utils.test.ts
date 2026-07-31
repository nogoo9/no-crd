import { describe, expect, test } from "bun:test";
import { jsonToYaml } from "~/ui/utils.js";

describe("jsonToYaml string escaping", () => {
	test("escapes backslashes before double quotes in string scalar values", () => {
		const input = {
			testKey: 'value with "quotes" and \\backslashes\\',
		};
		const result = jsonToYaml(input);
		expect(result).toContain(
			'testKey: "value with \\"quotes\\" and \\\\backslashes\\\\"',
		);
	});

	test("handles multiline strings using block scalar format", () => {
		const input = {
			multiline: "line 1\nline 2\n",
		};
		const result = jsonToYaml(input);
		expect(result).toContain("multiline: |\n    line 1\n    line 2\n");
	});
});
