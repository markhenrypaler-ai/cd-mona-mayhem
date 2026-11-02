import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { GET, prerender } from './[username].ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function createUpstreamData() {
	const start = new Date('2025-11-02T00:00:00.000Z');
	const weeks = Array.from({ length: 53 }, (_, index) => {
		const firstDay = new Date(start);
		firstDay.setUTCDate(start.getUTCDate() + index * 7);
		const dayCount = index === 52 ? 2 : 7;

		return {
			index,
			first_day: firstDay.toISOString().slice(0, 10),
			contribution_days: Array.from({ length: dayCount }, (_, weekday) => ({
				weekday,
				count: index === 0 && weekday === 0 ? 3 : 0,
				level: index === 0 && weekday === 0 ? 2 : 0,
			})),
		};
	});

	return {
		schema: 'v2',
		generated_at: '2026-11-02T17:19:14Z',
		from: '2025-11-02',
		to: '2026-11-02',
		range_days: 366,
		total_contributions: 3,
		private_contributions_included: false,
		colors_full: [],
		weeks,
		months: [],
	};
}

function responseWithJson(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

test('disables prerendering and normalizes the rolling-year contribution calendar', async () => {
	assert.equal(prerender, false);

	let requestedUrl;
	globalThis.fetch = async (url) => {
		requestedUrl = url;
		return responseWithJson(createUpstreamData());
	};

	const response = await GET({ params: { username: 'octocat' } });
	const body = await response.json();

	assert.equal(requestedUrl, 'https://github.com/octocat.contribs');
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
	assert.equal(body.username, 'octocat');
	assert.equal(body.totalContributions, 3);
	assert.equal(body.weeks.length, 53);
	assert.deepEqual(body.weeks[0].days[0], {
		date: '2025-11-02',
		count: 3,
		level: 2,
	});
	assert.deepEqual(body.weeks.at(-1).days.map((day) => day.date), [
		'2026-11-01',
		'2026-11-02',
	]);
});

test('rejects invalid username strings before making an upstream request', async () => {
	globalThis.fetch = async () => {
		throw new Error('fetch should not be called');
	};

	for (const username of ['', '-leading', 'trailing-', 'bad--name', 'with space', 'dot.name', 'a'.repeat(40)]) {
		const response = await GET({ params: { username } });
		assert.equal(response.status, 400, `expected ${JSON.stringify(username)} to be rejected`);
		assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
	}
});

test('parses a zero-contribution year without inventing activity', async () => {
	const data = createUpstreamData();
	data.total_contributions = 0;
	for (const week of data.weeks) {
		for (const day of week.contribution_days) {
			day.count = 0;
			day.level = 0;
		}
	}
	globalThis.fetch = async () => responseWithJson(data);

	const response = await GET({ params: { username: 'quiet-player' } });
	const body = await response.json();

	assert.equal(response.status, 200);
	assert.equal(body.totalContributions, 0);
	assert.ok(body.weeks.flatMap((week) => week.days).every((day) => day.count === 0 && day.level === 0));
});

test('maps an upstream not-found response to 404', async () => {
	globalThis.fetch = async () => new Response(null, { status: 404 });

	const response = await GET({ params: { username: 'missing-user' } });

	assert.equal(response.status, 404);
	assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
});

test('maps upstream and network failures to 502', async () => {
	globalThis.fetch = async () => new Response(null, { status: 503 });
	const upstreamFailure = await GET({ params: { username: 'octocat' } });
	assert.equal(upstreamFailure.status, 502);

	globalThis.fetch = async () => {
		throw new Error('network failure');
	};
	const networkFailure = await GET({ params: { username: 'octocat' } });
	assert.equal(networkFailure.status, 502);
	assert.equal(networkFailure.headers.get('cache-control'), 'public, max-age=300');
});

test('rejects malformed contribution data from upstream', async () => {
	const data = createUpstreamData();
	data.weeks[0].contribution_days[0].level = 5;
	globalThis.fetch = async () => responseWithJson(data);

	const response = await GET({ params: { username: 'octocat' } });

	assert.equal(response.status, 502);
	assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
});
