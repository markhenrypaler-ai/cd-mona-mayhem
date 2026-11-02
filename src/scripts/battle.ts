import {
	calculatePlayerStats,
	getFighterClass,
	scoreBattle,
	type BattleCategory,
	type ContributionDay,
	type ContributionResponse,
} from './scoring';
import { isSoundEnabled, playSound, setSoundEnabled } from './sound-effects';

const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const form = document.querySelector<HTMLFormElement>('#battle-form');
const playerOneInput = document.querySelector<HTMLInputElement>('#player-one');
const playerTwoInput = document.querySelector<HTMLInputElement>('#player-two');
const battleButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
const readyMessage = document.querySelector<HTMLElement>('#battle-ready');
const loadingMessage = document.querySelector<HTMLElement>('#battle-loading');
const errorMessage = document.querySelector<HTMLElement>('#battle-error');
const results = document.querySelector<HTMLElement>('#battle-results');
const winnerBanner = document.querySelector<HTMLElement>('#winner-banner');
const fightSequence = document.querySelector<HTMLElement>('#fight-sequence');
const fightCountdown = document.querySelector<HTMLElement>('#fight-countdown');
const particles = document.querySelector<HTMLElement>('#celebration-particles');
const scoreOne = document.querySelector<HTMLElement>('#score-one');
const scoreTwo = document.querySelector<HTMLElement>('#score-two');
const scoreOneName = document.querySelector<HTMLElement>('#score-one-name');
const scoreTwoName = document.querySelector<HTMLElement>('#score-two-name');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const soundToggle = document.querySelector<HTMLButtonElement>('#sfx-toggle');
let battleInProgress = false;

function updateSoundToggle(): void {
	if (!soundToggle) {
		return;
	}

	const enabled = isSoundEnabled();
	soundToggle.setAttribute('aria-pressed', String(enabled));
	soundToggle.textContent = `${enabled ? '🔊' : '🔇'} SFX: ${enabled ? 'ON' : 'OFF'}`;
	soundToggle.setAttribute('aria-label', `Sound effects ${enabled ? 'on' : 'off'}`);
}

soundToggle?.addEventListener('click', () => {
	setSoundEnabled(!isSoundEnabled());
	updateSoundToggle();
	if (isSoundEnabled()) {
		playSound('coin');
	}
});
updateSoundToggle();

function syncBattleUrl(playerOne: string, playerTwo: string): void {
	const url = new URL(window.location.href);
	url.searchParams.set('p1', playerOne);
	url.searchParams.set('p2', playerTwo);
	window.history.replaceState(null, '', url);
}

function wait(milliseconds: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion.matches ? 0 : milliseconds));
}

async function runFightCountdown(): Promise<void> {
	if (!fightSequence || !fightCountdown) {
		return;
	}

	fightSequence.hidden = false;
	fightSequence.classList.remove('fight-started');
	for (const number of ['3', '2', '1']) {
		fightCountdown.textContent = number;
		await wait(500);
	}
	fightCountdown.textContent = 'FIGHT!';
	fightSequence.classList.add('fight-started');
	await wait(400);
	fightSequence.hidden = true;
}

function celebrateBattle(): void {
	if (!winnerBanner) {
		return;
	}

	winnerBanner.classList.remove('winner-reveal');
	void winnerBanner.offsetWidth;
	winnerBanner.classList.add('winner-reveal');
	if (winnerBanner.classList.contains('winner-tie') || prefersReducedMotion.matches) {
		return;
	}

	document.body.classList.remove('screen-shake');
	void document.body.offsetWidth;
	document.body.classList.add('screen-shake');
	window.setTimeout(() => document.body.classList.remove('screen-shake'), 550);

	if (!particles) {
		return;
	}
	particles.replaceChildren();
	const colors = ['#46f5d0', '#ff65c3', '#ffe083', '#bb86fc'];
	for (let index = 0; index < 28; index += 1) {
		const particle = document.createElement('span');
		const angle = (Math.PI * 2 * index) / 28;
		const distance = 90 + Math.random() * 190;
		particle.className = 'celebration-particle';
		particle.style.setProperty('--particle-color', colors[index % colors.length]);
		particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
		particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);
		particle.style.setProperty('--particle-delay', `${Math.random() * 120}ms`);
		particles.append(particle);
	}
	window.setTimeout(() => particles.replaceChildren(), 1800);
}

form?.addEventListener('click', (event) => {
	const target = event.target;
	if (!(target instanceof Element)) {
		return;
	}

	const preset = target.closest<HTMLButtonElement>('.preset-button');
	const clickedBattle = target.closest<HTMLButtonElement>('#battle-form button[type="submit"]');
	if (preset || clickedBattle) {
		playSound('coin');
	}
	if (!preset || !playerOneInput || !playerTwoInput || !form || !battleButton) {
		return;
	}

	playerOneInput.value = preset.dataset.playerOne ?? '';
	playerTwoInput.value = preset.dataset.playerTwo ?? '';
	form.requestSubmit(battleButton);
});

function isContributionResponse(value: unknown): value is ContributionResponse {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const response = value as Partial<ContributionResponse>;
	return (
		typeof response.username === 'string' &&
		typeof response.from === 'string' &&
		typeof response.to === 'string' &&
		Number.isInteger(response.totalContributions) &&
		(response.totalContributions as number) >= 0 &&
		Array.isArray(response.weeks) &&
		response.weeks.every(
			(week) =>
				typeof week === 'object' &&
				week !== null &&
				typeof week.weekStart === 'string' &&
				Array.isArray(week.days) &&
				week.days.every(
					(day) =>
						typeof day === 'object' &&
						day !== null &&
						typeof day.date === 'string' &&
						Number.isInteger(day.count) &&
						day.count >= 0 &&
						Number.isInteger(day.level) &&
						day.level >= 0 &&
						day.level <= 4,
				),
		)
	);
}

async function fetchContributions(username: string, playerLabel: string): Promise<ContributionResponse> {
	let response: Response;
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
	try {
		response = await fetch(`/api/contributions/${encodeURIComponent(username)}`, {
			signal: controller.signal,
		});
	} catch {
		if (controller.signal.aborted) {
			throw new Error(`${playerLabel} (@${username}): the contribution request timed out.`);
		}
		throw new Error(`${playerLabel} (@${username}): unable to reach the contribution service.`);
	} finally {
		window.clearTimeout(timeoutId);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error(`${playerLabel} (@${username}): received an invalid response.`);
	}

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error(`${playerLabel}: GitHub user “${username}” was not found.`);
		}

		const message =
			typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
				? data.error
				: 'Unable to load contributions';
		throw new Error(`${playerLabel} (@${username}): ${message}.`);
	}

	if (!isContributionResponse(data)) {
		throw new Error(`${playerLabel} (@${username}): received invalid contribution data.`);
	}

	return data;
}

async function setPlayerCard(
	player: '1' | '2',
	label: string,
	response: ContributionResponse,
): Promise<void> {
	const card = document.querySelector<HTMLElement>(`#player-card-${player}`);
	if (!card) {
		return;
	}

	const profileLink = card.querySelector<HTMLAnchorElement>('.player-name');
	const avatar = card.querySelector<HTMLImageElement>('.player-avatar');
	if (profileLink && avatar) {
		profileLink.href = `https://github.com/${encodeURIComponent(response.username)}`;
		profileLink.textContent = `@${response.username}`;
		profileLink.hidden = false;
		card.querySelector('.player-placeholder')?.setAttribute('hidden', '');
		avatar.src = `https://github.com/${encodeURIComponent(response.username)}.png`;
		avatar.alt = `${response.username} GitHub avatar`;
		avatar.hidden = false;
		avatar.onerror = () => {
			avatar.hidden = true;
		};
	}

	const stats = calculatePlayerStats(response);
	const fighterClass = getFighterClass(response);
	const classBadge = card.querySelector<HTMLElement>('.fighter-class-badge');
	if (classBadge) {
		classBadge.textContent = `${fighterClass.emblem} ${fighterClass.name}`;
		classBadge.title = fighterClass.description;
		classBadge.hidden = false;
	}
	const statValues: Record<string, string> = {
		total: response.totalContributions.toLocaleString(),
		'longest-streak': `${stats.longestStreak} days`,
		'current-streak': `${stats.currentStreak} days`,
		'peak-day': `${stats.peakDay.count.toLocaleString()} · ${stats.peakDay.date}`,
		consistency: `${Math.round(stats.consistency)}%`,
	};
	for (const [name, value] of Object.entries(statValues)) {
		const element = card.querySelector<HTMLElement>(`[data-stat="${name}"]`);
		if (element) {
			element.textContent = value;
		}
	}

	const grid = card.querySelector<HTMLElement>('.contribution-grid');
	if (!grid) {
		return;
	}
	grid.replaceChildren();
	grid.setAttribute('aria-label', `${label} contribution calendar for @${response.username}`);

	for (const [weekIndex, week] of response.weeks.entries()) {
		const weekColumn = document.createElement('div');
		weekColumn.className = 'contribution-week';
		weekColumn.style.setProperty('--week-delay', `${weekIndex * 28}ms`);
		const daysByWeekday = new Map(
			week.days.map((day) => [new Date(`${day.date}T00:00:00.000Z`).getUTCDay(), day]),
		);
		for (let weekday = 0; weekday < 7; weekday += 1) {
			const day = daysByWeekday.get(weekday);
			const cell = document.createElement('span');
			cell.className = 'contribution-cell';
			if (day) {
				cell.dataset.level = String(day.level);
				cell.title = `${day.date}: ${day.count} contributions`;
				cell.setAttribute('aria-label', `${day.date}: ${day.count} contributions`);
			} else {
				cell.setAttribute('aria-hidden', 'true');
			}
			weekColumn.append(cell);
		}
		grid.append(weekColumn);
	}
	grid.classList.add('grid-filling');
	const weekCount = response.weeks.length;
	await wait(Math.max(0, weekCount - 1) * 28 + 260);
}

function clearResults(): void {
	results?.setAttribute('hidden', '');
	if (fightSequence) {
		fightSequence.hidden = true;
		fightSequence.classList.remove('fight-started');
	}
	if (winnerBanner) {
		winnerBanner.textContent = 'VS';
		winnerBanner.classList.remove(
			'winner-player-one',
			'winner-player-two',
			'winner-tie',
			'winner-reveal',
		);
	}
	document.body.classList.remove('screen-shake');
	particles?.replaceChildren();
	if (scoreOne) {
		scoreOne.textContent = '—';
	}
	if (scoreTwo) {
		scoreTwo.textContent = '—';
	}
	if (scoreOneName) {
		scoreOneName.textContent = 'Player 1';
	}
	if (scoreTwoName) {
		scoreTwoName.textContent = 'Player 2';
	}
	for (const row of document.querySelectorAll<HTMLTableRowElement>('[data-category]')) {
		row.classList.remove('is-category-tie');
		row.classList.remove('category-reveal');
		row.classList.add('category-pending');
		for (const cell of row.querySelectorAll<HTMLTableCellElement>('[data-value]')) {
			cell.textContent = '—';
			cell.classList.remove('is-category-winner');
			cell.removeAttribute('title');
		}
	}
	setHealth('1', 100);
	setHealth('2', 100);
	for (const player of ['1', '2'] as const) {
		const card = document.querySelector<HTMLElement>(`#player-card-${player}`);
		if (!card) {
			continue;
		}
		card.querySelector('.player-name')?.setAttribute('hidden', '');
		const classBadge = card.querySelector<HTMLElement>('.fighter-class-badge');
		if (classBadge) {
			classBadge.hidden = true;
			classBadge.textContent = '';
			classBadge.title = '';
		}
		card.querySelector('.player-avatar')?.setAttribute('hidden', '');
		card.querySelector('.player-placeholder')?.removeAttribute('hidden');
		const grid = card.querySelector<HTMLElement>('.contribution-grid');
		if (grid) {
			grid.replaceChildren();
			grid.classList.remove('grid-filling');
			grid.setAttribute('aria-label', `Player ${player} contribution calendar`);
		}
		for (const stat of card.querySelectorAll<HTMLElement>('[data-stat]')) {
			stat.textContent = '—';
		}
	}
}

function showLoadingSkeletons(): void {
	if (results) {
		results.hidden = false;
	}

	for (const player of ['1', '2'] as const) {
		const grid = document.querySelector<HTMLElement>(`#player-card-${player} .contribution-grid`);
		if (!grid) {
			continue;
		}

		grid.replaceChildren();
		grid.setAttribute('aria-label', `Player ${player} contribution calendar loading`);
		for (let weekIndex = 0; weekIndex < 52; weekIndex += 1) {
			const week = document.createElement('div');
			week.className = 'contribution-week';
			week.style.opacity = '1';
			for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
				const cell = document.createElement('span');
				cell.className = 'contribution-cell loading-skeleton';
				cell.setAttribute('aria-hidden', 'true');
				week.append(cell);
			}
			grid.append(week);
		}
	}
}

function setHealth(player: '1' | '2', value: number): void {
	const bar = document.querySelector<HTMLElement>(`#health-bar-${player === '1' ? 'one' : 'two'}`);
	const label = document.querySelector<HTMLElement>(`#health-value-${player === '1' ? 'one' : 'two'}`);
	const track = bar?.parentElement;
	if (bar) {
		bar.style.width = `${value}%`;
	}
	if (label) {
		label.textContent = `${value}%`;
	}
	track?.setAttribute('aria-valuenow', String(value));
}

async function renderBattleScore(one: ContributionResponse, two: ContributionResponse): Promise<void> {
	const battle = scoreBattle(one, two);
	const playerNames = {
		playerOne: `@${one.username}`,
		playerTwo: `@${two.username}`,
	};
	if (scoreOneName) {
		scoreOneName.textContent = playerNames.playerOne;
	}
	if (scoreTwoName) {
		scoreTwoName.textContent = playerNames.playerTwo;
	}

	const categoryPlayerOne = document.querySelector<HTMLElement>('#category-player-one');
	const categoryPlayerTwo = document.querySelector<HTMLElement>('#category-player-two');
	const healthNameOne = document.querySelector<HTMLElement>('#health-name-one');
	const healthNameTwo = document.querySelector<HTMLElement>('#health-name-two');
	if (categoryPlayerOne) {
		categoryPlayerOne.textContent = playerNames.playerOne;
	}
	if (categoryPlayerTwo) {
		categoryPlayerTwo.textContent = playerNames.playerTwo;
	}
	if (healthNameOne) {
		healthNameOne.textContent = playerNames.playerOne.toUpperCase();
	}
	if (healthNameTwo) {
		healthNameTwo.textContent = playerNames.playerTwo.toUpperCase();
	}

	const statValues = {
		playerOne: {
			totalContributions: battle.playerOne.totalContributions.toLocaleString(),
			longestStreak: `${battle.playerOne.longestStreak} days`,
			currentStreak: `${battle.playerOne.currentStreak} days`,
			peakDay: `${battle.playerOne.peakDay.count.toLocaleString()} · ${battle.playerOne.peakDay.date}`,
			consistency: `${Math.round(battle.playerOne.consistency)}%`,
		},
		playerTwo: {
			totalContributions: battle.playerTwo.totalContributions.toLocaleString(),
			longestStreak: `${battle.playerTwo.longestStreak} days`,
			currentStreak: `${battle.playerTwo.currentStreak} days`,
			peakDay: `${battle.playerTwo.peakDay.count.toLocaleString()} · ${battle.playerTwo.peakDay.date}`,
			consistency: `${Math.round(battle.playerTwo.consistency)}%`,
		},
	};

	const rows = [...document.querySelectorAll<HTMLTableRowElement>('[data-category]')];
	for (const row of rows) {
		const category = row.dataset.category as BattleCategory;
		const winner = battle.categoryWinners[category];
		row.classList.toggle('is-category-tie', winner === 'tie');
		for (const player of ['playerOne', 'playerTwo'] as const) {
			const cell = row.querySelector<HTMLTableCellElement>(`[data-value="${player}"]`);
			if (!cell) {
				continue;
			}
			cell.textContent = statValues[player][category];
			cell.classList.toggle('is-category-winner', winner !== 'tie' && winner === player);
			cell.title = winner === 'tie' ? 'Category tied' : winner === player ? 'Category winner: 1 point' : '';
		}
	}

	let playerOnePoints = 0;
	let playerTwoPoints = 0;
	let playerOneHealth = 100;
	let playerTwoHealth = 100;
	if (scoreOne) scoreOne.textContent = '0';
	if (scoreTwo) scoreTwo.textContent = '0';
	setHealth('1', playerOneHealth);
	setHealth('2', playerTwoHealth);

	for (const [index, row] of rows.entries()) {
		if (index > 0) {
			await wait(400);
		}
		row.classList.remove('category-pending');
		row.classList.add('category-reveal');
		playSound('hit');
		const category = row.dataset.category as BattleCategory;
		const categoryWinner = battle.categoryWinners[category];
		if (categoryWinner === 'playerOne') {
			playerOnePoints += 1;
			playerTwoHealth = Math.max(0, playerTwoHealth - 20);
		} else if (categoryWinner === 'playerTwo') {
			playerTwoPoints += 1;
			playerOneHealth = Math.max(0, playerOneHealth - 20);
		}
		if (scoreOne) scoreOne.textContent = String(playerOnePoints);
		if (scoreTwo) scoreTwo.textContent = String(playerTwoPoints);
		setHealth('1', playerOneHealth);
		setHealth('2', playerTwoHealth);
	}

	if (winnerBanner) {
		winnerBanner.classList.remove('winner-player-one', 'winner-player-two', 'winner-tie');
		winnerBanner.classList.add(
			battle.winner === 'playerOne'
				? 'winner-player-one'
				: battle.winner === 'playerTwo'
					? 'winner-player-two'
					: 'winner-tie',
		);
		winnerBanner.textContent =
			battle.winner === 'tie'
				? 'It’s a tie!'
				: `K.O. ${battle.winner === 'playerOne' ? playerNames.playerOne : playerNames.playerTwo} WINS!`;
	}
	celebrateBattle();
	playSound('victory');
}

form?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (battleInProgress) {
		return;
	}
	if (!playerOneInput || !playerTwoInput || !battleButton || !loadingMessage || !errorMessage) {
		return;
	}

	errorMessage.hidden = true;
	errorMessage.textContent = '';
	playerOneInput.value = playerOneInput.value.trim();
	playerTwoInput.value = playerTwoInput.value.trim();
	const usernames = [playerOneInput.value, playerTwoInput.value];
	const invalidPlayer = usernames.findIndex((username) => !USERNAME_PATTERN.test(username));
	if (invalidPlayer !== -1) {
		clearResults();
		errorMessage.textContent = `Enter a valid GitHub username for Player ${invalidPlayer + 1}.`;
		errorMessage.hidden = false;
		(invalidPlayer === 0 ? playerOneInput : playerTwoInput).focus();
		return;
	}

	syncBattleUrl(usernames[0], usernames[1]);
	clearResults();
	battleInProgress = true;
	if (readyMessage) {
		readyMessage.hidden = true;
	}
	battleButton.disabled = true;
	battleButton.setAttribute('aria-busy', 'true');
	loadingMessage.hidden = false;
	showLoadingSkeletons();
	results?.setAttribute('aria-busy', 'true');
	playSound('powerUp');
	const countdown = runFightCountdown();

	try {
		const [one, two] = await Promise.all([
			fetchContributions(usernames[0], 'Player 1'),
			fetchContributions(usernames[1], 'Player 2'),
		]);
		await countdown;

		if (results) {
			results.hidden = false;
		}
		await Promise.all([setPlayerCard('1', 'Player 1', one), setPlayerCard('2', 'Player 2', two)]);
		await renderBattleScore(one, two);
	} catch (error) {
		await countdown;
		clearResults();
		errorMessage.textContent =
			error instanceof Error ? error.message : 'The battle could not be completed.';
		errorMessage.hidden = false;
	} finally {
		battleInProgress = false;
		loadingMessage.hidden = true;
		battleButton.disabled = false;
		battleButton.removeAttribute('aria-busy');
		results?.removeAttribute('aria-busy');
	}
});

if (form && playerOneInput && playerTwoInput && battleButton) {
	const params = new URLSearchParams(window.location.search);
	const playerOne = params.get('p1')?.trim() ?? '';
	const playerTwo = params.get('p2')?.trim() ?? '';
	if (USERNAME_PATTERN.test(playerOne) && USERNAME_PATTERN.test(playerTwo)) {
		playerOneInput.value = playerOne;
		playerTwoInput.value = playerTwo;
		form.requestSubmit(battleButton);
	}
}
