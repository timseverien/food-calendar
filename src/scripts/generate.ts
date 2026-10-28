#!/usr/bin/env zx

import { type CheerioAPI, load } from "cheerio/slim";
import type { IterableElement } from "type-fest";
import { fetch } from "zx";

import type { FoodEvent } from "../food/FoodEvent.model.ts";

const response = await fetch("https://en.wikipedia.org/wiki/List_of_food_days");
const html = await response.text();

const $ = load(html);

for (const section of $("section:has(table.wikitable)")) {
	const $section = $(section);
	const sectionTitle = $section.find("h2").first().text();
	const nation = parseNation(sectionTitle);

	for (const table of $(section).find("table.wikitable")) {
		const $table = $(table);

		for (const row of $table.find("tbody tr")) {
			const $row = $(row);

			const [cellDate, cellEvent] = $row
				.find("td")
				.toArray()
				.map((elCell) => $(elCell));

			const date = cellDate?.text();
			const name = cellEvent?.text();

			if (!date || !name) {
				console.warn("Unable to process", {
					date,
					name,
					areaOfOrigin: nation,
					html: $row.html(),
				});
				continue;
			}

			const foodEvent: FoodEvent = {
				date,
				name,
				areaOfOrigin: nation,
			};

			console.log(foodEvent);
		}
	}
}

function parseNation(nation: string): string | null {
	const trimmed = nation.trim();

	if (trimmed.toLocaleLowerCase().includes("global")) {
		return null;
	}

	return trimmed || null;
}
