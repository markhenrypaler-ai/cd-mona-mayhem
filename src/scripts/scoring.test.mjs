import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePlayerStats, getFighterClass, scoreBattle } from './scoring.ts';

function contributions(username, totalContributions, dailyCounts) {
	const days = dailyCounts.map(([date, count]) => ({ date, count, level: count ? 1 : 0 }));
	return {
		username,
		from: days[0]?.date ?? '2026-01-01',
		to: days.at(-1)?.date ?? '2026-01-01',
		totalContributions,
		weeks: [{ weekStart: '2026-01-04', days }],
	};
}

test('calculates contribution stats from daily counts', () => {
	const response = contributions('active-player', 9, [
		['2026-01-01', 1],
		['2026-01-02', 2],
		['2026-01-03', 0],
		['2026-01-04', 4],
		['2026-01-05', 3],
	]);

	assert.deepEqual(calculatePlayerStats(response), {
		totalContributions: 9,
		longestStreak: 2,
		currentStreak: 2,
		peakDay: { date: '2026-01-04', count: 4, level: 1 },
		consistency: 80,
	});
});

test('calculates a streak across month and year boundaries', () => {
	const response = contributions('new-year-player', 3, [
		['2025-12-30', 1],
		['2025-12-31', 2],
		['2026-01-01', 1],
		['2026-01-02', 3],
	]);

	const stats = calculatePlayerStats(response);
	assert.equal(stats.longestStreak, 4);
	assert.equal(stats.currentStreak, 4);
});

test('returns zero stats for a player with no contributions all year', () => {
	const response = contributions('quiet-player', 0, [
		['2025-11-03', 0],
		['2026-05-04', 0],
		['2026-11-03', 0],
	]);

	assert.deepEqual(calculatePlayerStats(response), {
		totalContributions: 0,
		longestStreak: 0,
		currentStreak: 0,
		peakDay: { date: '2025-11-03', count: 0, level: 0 },
		consistency: 0,
	});
});

test('awards one point for each category winner and names the overall winner', () => {
	const playerOne = contributions('one', 20, [
		['2026-01-01', 2],
		['2026-01-02', 0],
		['2026-01-03', 4],
		['2026-01-04', 0],
	]);
	const playerTwo = contributions('two', 10, [
		['2026-01-01', 1],
		['2026-01-02', 1],
		['2026-01-03', 1],
		['2026-01-04', 1],
	]);

	const result = scoreBattle(playerOne, playerTwo);

	assert.equal(result.categoryWinners.totalContributions, 'playerOne');
	assert.equal(result.categoryWinners.longestStreak, 'playerTwo');
	assert.equal(result.categoryWinners.peakDay, 'playerOne');
	assert.equal(result.categoryWinners.consistency, 'playerTwo');
	assert.equal(result.playerOneScore, 2);
	assert.equal(result.playerTwoScore, 3);
	assert.equal(result.winner, 'playerTwo');
});

test('does not award points for tied categories and reports a match tie', () => {
	const playerOne = contributions('one', 5, [
		['2026-01-01', 1],
		['2026-01-02', 0],
	]);
	const playerTwo = contributions('two', 5, [
		['2026-01-01', 1],
		['2026-01-02', 0],
	]);

	const result = scoreBattle(playerOne, playerTwo);

	assert.deepEqual(result.playerOne, result.playerTwo);
	assert.ok(Object.values(result.categoryWinners).every((winner) => winner === 'tie'));
	assert.equal(result.playerOneScore, 0);
	assert.equal(result.playerTwoScore, 0);
	assert.equal(result.winner, 'tie');
});

test('assigns a Weekend Warrior when at least 40% of contributions land on weekends', () => {
	const response = contributions('weekend-player', 10, [
		['2026-01-02', 1],
		['2026-01-03', 4],
		['2026-01-04', 5],
	]);

	assert.equal(getFighterClass(response).name, 'Weekend Warrior');
});

test('prioritizes long streaks and recognizes a high single-day peak', () => {
	const streakDays = Array.from({ length: 31 }, (_, index) => {
		const date = new Date('2026-01-01T00:00:00.000Z');
		date.setUTCDate(date.getUTCDate() + index);
		return [date.toISOString().slice(0, 10), 1];
	});
	const paladin = contributions('paladin', 31, streakDays);
	const berserker = contributions('berserker', 24, [
		['2026-01-01', 2],
		['2026-01-02', 22],
	]);

	assert.equal(getFighterClass(paladin).name, 'Streak Paladin');
	assert.equal(getFighterClass(berserker).name, 'Commit Berserker');
});
