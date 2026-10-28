import { describe, expect, it } from "vitest";

import {
	type TableCell,
	type TableRow,
	materializeRowSpan,
	parseTableRow,
	parseTableRows,
} from "./html.ts";

describe(parseTableRow, () => {
	it("returns one array item for each cell", () => {
		const html = `<tr>
			<td>cell 1</td>
			<td>cell 2</td>
			<td>cell 3</td>
		</tr>`;

		const result = parseTableRow(html).toArray();

		expect(result).toHaveLength(3);
	});

	it("returns cell content", () => {
		const html = "<tr><td>cell content</td></tr>";

		const result = parseTableRow(html).toArray();

		expect(result).toStrictEqual([expect.objectContaining({ content: "cell content" })]);
	});

	it("returns cell colspan", () => {
		const html = `<tr>
			<td colspan="2">cell 1</td>
			<td>cell 2</td>
		</tr>`;

		const result = parseTableRow(html).toArray();

		expect(result).toStrictEqual([
			expect.objectContaining({ colspan: 2 }),
			expect.objectContaining({ colspan: 1 }),
		]);
	});

	it("returns cell rowspan", () => {
		const html = `<tr>
			<td rowspan="2">cell 1</td>
			<td>cell 2</td>
		</tr>`;

		const result = parseTableRow(html).toArray();

		expect(result).toStrictEqual([
			expect.objectContaining({ rowspan: 2 }),
			expect.objectContaining({ rowspan: 1 }),
		]);
	});

	it("ignores colspan", () => {
		const html = '<tr><td colspan="2">cell content</td></tr>';

		const result = parseTableRow(html).toArray();

		expect(result).toStrictEqual([expect.objectContaining({ content: "cell content" })]);
	});

	it("ignores rowspan", () => {
		const html = '<tr><td rowspan="2">cell content</td></tr>';

		const result = parseTableRow(html).toArray();

		expect(result).toStrictEqual([expect.objectContaining({ content: "cell content" })]);
	});

	it.for([
		{ tag: "td", type: "data" },
		{ tag: "th", type: "header" },
	])("returns '$type' cell type for <$tag>", ({ tag, type }) => {
		const html = `<tr><${tag}>cell</${tag}></tr>`;

		const result = parseTableRow(html).toArray();

		expect(result).toStrictEqual([expect.objectContaining({ type })]);
	});
});

describe(parseTableRows, () => {
	it("returns one array item for each row", () => {
		const html = `<tr>
			<td>cell 1</td>
			<td>cell 2</td>
			<td>cell 3</td>
		</tr><tr>
			<td>cell 1</td>
			<td>cell 2</td>
			<td>cell 3</td>
		</tr>`;

		const result = parseTableRows(html).toArray();

		expect(result).toHaveLength(2);
	});

	it("materializes colspan", () => {
		const html = `<tr>
			<td colspan="2">cell 1</td>
			<td>cell 2</td>
		</tr><tr>
			<td>cell 3</td>
			<td colspan="2">cell 4</td>
		</tr>`;

		const result = parseTableRows(html).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "cell 1" }),
				expect.objectContaining({ content: "cell 1" }),
				expect.objectContaining({ content: "cell 2" }),
			],
			[
				expect.objectContaining({ content: "cell 3" }),
				expect.objectContaining({ content: "cell 4" }),
				expect.objectContaining({ content: "cell 4" }),
			],
		]);
	});

	it("ignores rowspan", () => {
		const html = `<tr>
			<td rowspan="2">cell 1</td>
			<td>cell 2</td>
		</tr><tr>
			<td>cell 3</td>
		</tr>`;

		const result = parseTableRows(html).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "cell 1" }),
				expect.objectContaining({ content: "cell 2" }),
			],
			[expect.objectContaining({ content: "cell 3" })],
		]);
	});
});

describe(materializeRowSpan, () => {
	it("returns unchanged TableRows if no rowspans are set", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 1 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 1 },
			],
			[
				{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 },
				{ type: "data", content: "Cell 4", colspan: 1, rowspan: 1 },
			],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual(rows);
	});

	it("expands cells with rowspan to next rows", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 3 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 1 },
			],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 }],
			[{ type: "data", content: "Cell 4", colspan: 1, rowspan: 1 }],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 4" }),
			],
		] satisfies TableRow[]);
	});

	it("materializes a new rowspan that starts after a carried cell", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 2 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 1 },
			],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 2 }],
			[{ type: "data", content: "Cell 4", colspan: 1, rowspan: 1 }],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
			[
				expect.objectContaining({ content: "Cell 4" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
		] satisfies TableRow[]);
	});

	it("stops carrying a cell once its rowspan has ended", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 2 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 1 },
			],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 }],
			[
				{ type: "data", content: "Cell 4", colspan: 1, rowspan: 1 },
				{ type: "data", content: "Cell 5", colspan: 1, rowspan: 1 },
			],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
			[
				expect.objectContaining({ content: "Cell 4" }),
				expect.objectContaining({ content: "Cell 5" }),
			],
		] satisfies TableRow[]);
	});

	it("materializes a rowspan in the middle or last column", () => {
		const columnCount = 3;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 1 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 2 },
				{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 },
			],
			[
				{ type: "data", content: "Cell 4", colspan: 1, rowspan: 1 },
				{ type: "data", content: "Cell 5", colspan: 1, rowspan: 1 },
			],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
			[
				expect.objectContaining({ content: "Cell 4" }),
				expect.objectContaining({ content: "Cell 2" }),
				expect.objectContaining({ content: "Cell 5" }),
			],
		] satisfies TableRow[]);
	});

	it("expires multiple rowspans independently", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 3 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 2 },
			],
			[],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 }],
			[
				{ type: "data", content: "Cell 4", colspan: 1, rowspan: 1 },
				{ type: "data", content: "Cell 5", colspan: 1, rowspan: 1 },
			],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
			[
				expect.objectContaining({ content: "Cell 4" }),
				expect.objectContaining({ content: "Cell 5" }),
			],
		] satisfies TableRow[]);
	});

	it("carries both columns of a cell that has colspan and rowspan", () => {
		const columnCount = 3;
		const spanning: TableCell = { type: "data", content: "Cell 1", colspan: 2, rowspan: 2 };
		const rows: TableRow[] = [
			[spanning, spanning, { type: "data", content: "Cell 2", colspan: 1, rowspan: 1 }],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 }],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result).toStrictEqual([
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 2" }),
			],
			[
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 1" }),
				expect.objectContaining({ content: "Cell 3" }),
			],
		] satisfies TableRow[]);
	});

	it("returns no rows for no input", () => {
		const result = materializeRowSpan([], 2).toArray();

		expect(result).toStrictEqual([]);
	});

	it("keeps the type and metadata of carried cells", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "header", content: "Cell 1", colspan: 1, rowspan: 2 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 1 },
			],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 }],
		];

		const result = materializeRowSpan(rows, columnCount).toArray();

		expect(result[1]?.[0]).toStrictEqual({
			type: "header",
			content: "Cell 1",
			colspan: 1,
			rowspan: 2,
		});
	});

	it("does not mutate the input rows", () => {
		const columnCount = 2;
		const rows: TableRow[] = [
			[
				{ type: "data", content: "Cell 1", colspan: 1, rowspan: 2 },
				{ type: "data", content: "Cell 2", colspan: 1, rowspan: 1 },
			],
			[{ type: "data", content: "Cell 3", colspan: 1, rowspan: 1 }],
		];
		const original = structuredClone(rows);

		materializeRowSpan(rows, columnCount).toArray();

		expect(rows).toStrictEqual(original);
	});
});
