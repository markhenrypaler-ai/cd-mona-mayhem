type SoundEffect = 'coin' | 'powerUp' | 'hit' | 'victory';

let audioContext: AudioContext | undefined;
let masterGain: GainNode | undefined;
let enabled = true;

function getAudioContext(): AudioContext | undefined {
	if (typeof window === 'undefined' || !('AudioContext' in window)) {
		return undefined;
	}

	audioContext ??= new AudioContext();
	if (!masterGain) {
		masterGain = audioContext.createGain();
		masterGain.gain.value = enabled ? 1 : 0;
		masterGain.connect(audioContext.destination);
	}
	if (audioContext.state === 'suspended') {
		void audioContext.resume();
	}
	return audioContext;
}

function playTone(
	context: AudioContext,
	frequency: number,
	start: number,
	duration: number,
	type: OscillatorType,
	volume: number,
): void {
	const oscillator = context.createOscillator();
	const gain = context.createGain();
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, start);
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	oscillator.connect(gain);
	gain.connect(masterGain ?? context.destination);
	oscillator.start(start);
	oscillator.stop(start + duration + 0.02);
}

const effects: Record<SoundEffect, (context: AudioContext, start: number) => void> = {
	coin(context, start) {
		playTone(context, 880, start, 0.07, 'square', 0.08);
		playTone(context, 1320, start + 0.065, 0.11, 'square', 0.06);
	},
	powerUp(context, start) {
		[523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, index) => {
			playTone(context, frequency, start + index * 0.105, 0.16, 'triangle', 0.07);
		});
	},
	hit(context, start) {
		playTone(context, 165, start, 0.12, 'square', 0.09);
		playTone(context, 82, start + 0.015, 0.15, 'sawtooth', 0.045);
	},
	victory(context, start) {
		[659.25, 783.99, 987.77, 1318.51].forEach((frequency, index) => {
			playTone(context, frequency, start + index * 0.13, 0.22, 'square', 0.07);
		});
		playTone(context, 1046.5, start + 0.58, 0.38, 'triangle', 0.08);
	},
};

export function playSound(effect: SoundEffect): void {
	if (!enabled) {
		return;
	}

	const context = getAudioContext();
	if (context) {
		effects[effect](context, context.currentTime + 0.01);
	}
}

export function setSoundEnabled(value: boolean): void {
	enabled = value;
	if (audioContext && masterGain) {
		masterGain.gain.setTargetAtTime(value ? 1 : 0, audioContext.currentTime, 0.008);
	}
}

export function isSoundEnabled(): boolean {
	return enabled;
}
