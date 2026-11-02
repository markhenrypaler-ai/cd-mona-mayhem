export interface ContributionDay {
	date: string;
	count: number;
	level: number;
}

export interface ContributionWeek {
	weekStart: string;
	days: ContributionDay[];
}

export interface ContributionResponse {
	username: string;
	from: string;
	to: string;
	totalContributions: number;
	weeks: ContributionWeek[];
}

export interface PlayerStats {
	totalContributions: number;
	longestStreak: number;
	currentStreak: number;
	peakDay: ContributionDay;
	consistency: number;
}

export interface FighterClass {
	name: string;
	emblem: string;
	description: string;
}

export function getFighterClass(response: ContributionResponse): FighterClass {
	const stats = calculatePlayerStats(response);
	const days = getAllDays(response);
	const totalDailyContributions = days.reduce((total, day) => total + day.count, 0);
	const weekendContributions = days.reduce((total, day) => {
		const weekday = new Date(`${day.date}T00:00:00.000Z`).getUTCDay();
		return total + (weekday === 0 || weekday === 6 ? day.count : 0);
	}, 0);

	if (stats.longestStreak > 30) {
		return {
			name: 'Streak Paladin',
			emblem: '🛡️',
			description: `${stats.longestStreak}-day longest streak`,
		};
	}

	if (totalDailyContributions > 0 && weekendContributions / totalDailyContributions >= 0.4) {
		return {
			name: 'Weekend Warrior',
			emblem: '⚔️',
			description: `${Math.round((weekendContributions / totalDailyContributions) * 100)}% of contributions landed on weekends`,
		};
	}

	if (stats.peakDay.count >= 20) {
		return {
			name: 'Commit Berserker',
			emblem: '🪓',
			description: `Peak day: ${stats.peakDay.count} contributions`,
		};
	}

	return {
		name: 'Arcade Adventurer',
		emblem: '🕹️',
		description: 'A balanced contribution style',
	};
}

export type BattleCategory =
	| 'totalContributions'
	| 'longestStreak'
	| 'currentStreak'
	| 'peakDay'
	| 'consistency';

export interface BattleResult {
	playerOne: PlayerStats;
	playerTwo: PlayerStats;
	categoryWinners: Record<BattleCategory, 'playerOne' | 'playerTwo' | 'tie'>;
	playerOneScore: number;
	playerTwoScore: number;
	winner: 'playerOne' | 'playerTwo' | 'tie';
}

function getAllDays(response: ContributionResponse): ContributionDay[] {
	return response.weeks
		.flatMap((week) => week.days)
		.sort((left, right) => left.date.localeCompare(right.date));
}

function areConsecutive(previousDate: string, currentDate: string): boolean {
	const previous = new Date(`${previousDate}T00:00:00.000Z`);
	previous.setUTCDate(previous.getUTCDate() + 1);
	return previous.toISOString().slice(0, 10) === currentDate;
}

export function calculatePlayerStats(response: ContributionResponse): PlayerStats {
	const days = getAllDays(response);
	let currentRun = 0;
	let longestStreak = 0;
	let previousActiveDate: string | null = null;
	let peakDay = days[0] ?? { date: response.to, count: 0, level: 0 };

	for (const day of days) {
		if (day.count > peakDay.count) {
			peakDay = day;
		}

		if (day.count > 0) {
			currentRun =
				previousActiveDate && areConsecutive(previousActiveDate, day.date) ? currentRun + 1 : 1;
			longestStreak = Math.max(longestStreak, currentRun);
			previousActiveDate = day.date;
		} else {
			currentRun = 0;
			previousActiveDate = null;
		}
	}

	const lastDay = days.at(-1);
	let currentStreak = 0;
	if (lastDay?.count) {
		currentStreak = 1;
		for (let index = days.length - 2; index >= 0; index -= 1) {
			if (days[index].count === 0 || !areConsecutive(days[index].date, days[index + 1].date)) {
				break;
			}
			currentStreak += 1;
		}
	}

	const activeDays = days.filter((day) => day.count > 0).length;
	return {
		totalContributions: response.totalContributions,
		longestStreak,
		currentStreak,
		peakDay,
		consistency: days.length === 0 ? 0 : (activeDays / days.length) * 100,
	};
}

export function scoreBattle(
	playerOne: ContributionResponse,
	playerTwo: ContributionResponse,
): BattleResult {
	const statsOne = calculatePlayerStats(playerOne);
	const statsTwo = calculatePlayerStats(playerTwo);
	const compare = (one: number, two: number): 'playerOne' | 'playerTwo' | 'tie' =>
		one === two ? 'tie' : one > two ? 'playerOne' : 'playerTwo';

	const categoryWinners: Record<BattleCategory, 'playerOne' | 'playerTwo' | 'tie'> = {
		totalContributions: compare(statsOne.totalContributions, statsTwo.totalContributions),
		longestStreak: compare(statsOne.longestStreak, statsTwo.longestStreak),
		currentStreak: compare(statsOne.currentStreak, statsTwo.currentStreak),
		peakDay: compare(statsOne.peakDay.count, statsTwo.peakDay.count),
		consistency: compare(statsOne.consistency, statsTwo.consistency),
	};
	const playerOneScore = Object.values(categoryWinners).filter(
		(winner) => winner === 'playerOne',
	).length;
	const playerTwoScore = Object.values(categoryWinners).filter(
		(winner) => winner === 'playerTwo',
	).length;

	return {
		playerOne: statsOne,
		playerTwo: statsTwo,
		categoryWinners,
		playerOneScore,
		playerTwoScore,
		winner:
			playerOneScore === playerTwoScore
				? 'tie'
				: playerOneScore > playerTwoScore
					? 'playerOne'
					: 'playerTwo',
	};
}
