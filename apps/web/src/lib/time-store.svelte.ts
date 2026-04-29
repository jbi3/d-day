/**
 * Simulation clock for the D-Day map. simHours is hours since the
 * window start; t is normalized 0..1.
 *
 * Owned-RAF playback: calling play() starts a requestAnimationFrame
 * loop that advances simHours at `playRate` sim-hours per real second
 * until simHours reaches end, at which point it auto-pauses.
 */
export class TimeStore {
	simHours = $state(0);
	playing = $state(false);
	playRate = $state(0.5);

	#raf = 0;
	#lastFrame = 0;

	constructor(
		public readonly start: number,
		public readonly end: number,
		initialPlayRate = 0.5
	) {
		this.simHours = start;
		this.playRate = initialPlayRate;
	}

	get t(): number {
		const span = this.end - this.start;
		return span === 0 ? 0 : (this.simHours - this.start) / span;
	}

	seek(h: number): void {
		this.simHours = Math.max(this.start, Math.min(this.end, h));
	}

	play(): void {
		if (this.playing) return;
		this.playing = true;
		this.#lastFrame = performance.now();
		const step = (now: number) => {
			if (!this.playing) return;
			const dt = (now - this.#lastFrame) / 1000;
			this.#lastFrame = now;
			this.simHours = Math.min(this.end, this.simHours + dt * this.playRate);
			if (this.simHours >= this.end) {
				this.playing = false;
				return;
			}
			this.#raf = requestAnimationFrame(step);
		};
		this.#raf = requestAnimationFrame(step);
	}

	pause(): void {
		this.playing = false;
		if (this.#raf) cancelAnimationFrame(this.#raf);
	}

	toggle(): void {
		if (this.playing) this.pause();
		else this.play();
	}

	reset(): void {
		this.pause();
		this.simHours = this.start;
	}
}
