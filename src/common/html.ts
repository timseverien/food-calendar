import { load } from "cheerio/slim";

import { padEnd } from "./array.ts";

export type TableCellType = "data" | "header";
export type TableCell = {
	type: TableCellType;
	content: string;
	colspan: number;
	rowspan: number;
};
export type TableRow = (TableCell | null)[];

type Table = {
	header: TableRow[];
	footer: TableRow[];
	body: TableRow[];
};

export function parseTable(table: string): Table {
	const $ = load(table);
	const $header = $("thead").first();
	const $footer = $("tfoot").first();
	const $body = $("tbody").first();

	const header = parseTableRows($header.html() ?? "").toArray();
	const footer = parseTableRows($footer.html() ?? "").toArray();
	const body = parseTableRows($body.html() ?? "").toArray();

	const columnCount = [
		...header.map((row) => row.length),
		...footer.map((row) => row.length),
		...body.map((row) => row.length),
	].reduce((a, b) => Math.max(a, b), 0);

	return {
		header: header.map((row) => padEnd(row, columnCount, null)),
		footer: footer.map((row) => padEnd(row, columnCount, null)),
		body: body.map((row) => padEnd(row, columnCount, null)),
	};
}

type MaterializeRowSpanMemoryItem = {
	cell: TableCell;
	columnIndex: number;
	rowIndex: number;
} | null;

// oxlint-disable-next-line max-lines-per-function max-statements
export function* materializeRowSpan(rows: TableRow[], columnCount: number): Generator<TableRow> {
	let memory: MaterializeRowSpanMemoryItem[] = Array.from({ length: columnCount }, () => null);

	for (const [rowIndex, row] of rows.entries()) {
		const rowMutated = [...row];

		// Clean up previous cells that no longer apply due to their rowspans
		memory = memory.map((previousCell) => {
			const previousCellSpansToRowIndex = previousCell
				? previousCell.rowIndex + (previousCell.cell.rowspan - 1)
				: -1;
			return previousCellSpansToRowIndex >= rowIndex ? previousCell : null;
		});

		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
			const cell = row.at(columnIndex);
			// Memory is clean; non-null previous cells do apply to this row
			const previousCell = memory.at(columnIndex);

			// If previous cell is found, that means that current
			// and next columns need to shift right to accommodate.
			// We only need to shift one place as colspans have already materialized.
			if (previousCell) {
				rowMutated.splice(columnIndex, 0, {
					...previousCell.cell,
				});
				continue;
			}

			if (cell && cell.rowspan > 1) {
				memory[columnIndex] = {
					cell,
					columnIndex,
					rowIndex,
				};
			}
		}

		yield rowMutated;
	}
}

export function* parseTableRows(tableSection: string): Generator<TableRow> {
	const $ = load(tableSection);

	for (const row of $("tr")) {
		const $row = $(row);
		const html = $row.html() ?? "";

		yield parseTableRow(html)
			.toArray()
			.flatMap((cell) => {
				if (cell === null) {
					return null;
				}

				if (cell.colspan === 1) {
					return cell;
				}

				return Array.from({ length: cell.colspan }, () => cell);
			});
	}
}

export function* parseTableRow(row: string): Generator<TableCell | null> {
	const $ = load(row);

	for (const cell of $("td,th")) {
		const $cell = $(cell);

		const type: TableCellType = cell.tagName.toLowerCase() === "th" ? "header" : "data";
		const content = $cell.text();
		const colspan = Number.parseInt($cell.attr("colspan") ?? "1", 10);
		const rowspan = Number.parseInt($cell.attr("rowspan") ?? "1", 10);

		yield {
			type,
			content,
			colspan,
			rowspan,
		};
	}
}
