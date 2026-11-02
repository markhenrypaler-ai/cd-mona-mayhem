import type { APIRoute } from 'astro';

export const prerender = false;

const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const RESPONSE_HEADERS = {
	'Cache-Control': 'public, max-age=300',
	'Content-Type': 'application/json',
};

interface UpstreamContributionDay {
	weekday: number;
	count: number;
	level: number;
}

interface UpstreamContributionWeek {
	first_day: string;
	contribution_days: UpstreamContributionDay[];
}

interface UpstreamContributions {
	schema: 'v2';
	from: string;
	to: string;
	total_contributions: number;
	weeks: UpstreamContributionWeek[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseUpstreamContributions(value: unknown): UpstreamContributions | null {
	if (
		!isRecord(value) ||
		value.schema !== 'v2' ||
		!isIsoDate(value.from) ||
		!isIsoDate(value.to) ||
		value.from > value.to ||
		!Number.isInteger(value.total_contributions) ||
		(value.total_contributions as number) < 0 ||
		!Array.isArray(value.weeks) ||
		(value.weeks.length !== 52 && value.weeks.length !== 53)
	) {
		return null;
	}

	const weeks: UpstreamContributionWeek[] = [];

	for (const week of value.weeks) {
		if (
			!isRecord(week) ||
			!isIsoDate(week.first_day) ||
			new Date(`${week.first_day}T00:00:00.000Z`).getUTCDay() !== 0 ||
			!Array.isArray(week.contribution_days) ||
			week.contribution_days.length === 0 ||
			week.contribution_days.length > 7
		) {
			return null;
		}

		const days: UpstreamContributionDay[] = [];
		let previousWeekday = -1;

		for (const day of week.contribution_days) {
			if (
				!isRecord(day) ||
				!Number.isInteger(day.weekday) ||
				(day.weekday as number) < 0 ||
				(day.weekday as number) > 6 ||
				(day.weekday as number) <= previousWeekday ||
				!Number.isInteger(day.count) ||
				(day.count as number) < 0 ||
				!Number.isInteger(day.level) ||
				(day.level as number) < 0 ||
				(day.level as number) > 4
			) {
				return null;
			}

			previousWeekday = day.weekday as number;
			days.push({
				weekday: day.weekday as number,
				count: day.count as number,
				level: day.level as number,
			});
		}

		weeks.push({
			first_day: week.first_day,
			contribution_days: days,
		});
	}

	return {
		schema: 'v2',
		from: value.from,
		to: value.to,
		total_contributions: value.total_contributions as number,
		weeks,
	};
}

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: RESPONSE_HEADERS,
	});
}

export const GET: APIRoute = async ({ params }) => {
	const username = params.username;
	if (!username || !USERNAME_PATTERN.test(username)) {
		return jsonResponse({ error: 'Invalid GitHub username' }, 400);
	}

	let upstreamResponse: Response;
	try {
		upstreamResponse = await fetch(`https://github.com/${username}.contribs`, {
			headers: { Accept: 'application/json' },
		});
	} catch {
		return jsonResponse({ error: 'Unable to reach GitHub contributions service' }, 502);
	}

	if (upstreamResponse.status === 404) {
		return jsonResponse({ error: 'GitHub user not found' }, 404);
	}

	if (!upstreamResponse.ok) {
		return jsonResponse({ error: 'GitHub contributions service failed' }, 502);
	}

	let upstreamData: unknown;
	try {
		upstreamData = await upstreamResponse.json();
	} catch {
		return jsonResponse({ error: 'GitHub returned invalid contribution data' }, 502);
	}

	const contributions = parseUpstreamContributions(upstreamData);
	if (!contributions) {
		return jsonResponse({ error: 'GitHub returned invalid contribution data' }, 502);
	}

	return jsonResponse(
		{
			username,
			from: contributions.from,
			to: contributions.to,
			totalContributions: contributions.total_contributions,
			weeks: contributions.weeks.map((week) => ({
				weekStart: week.first_day,
				days: week.contribution_days.map((day) => {
					const date = new Date(`${week.first_day}T00:00:00.000Z`);
					date.setUTCDate(date.getUTCDate() + day.weekday);
					return {
						date: date.toISOString().slice(0, 10),
						count: day.count,
						level: day.level,
					};
				}),
			})),
		},
		200,
	);
};
