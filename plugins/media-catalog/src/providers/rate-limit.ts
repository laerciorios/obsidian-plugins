import { SupersededError } from './errors';

/**
 * Client-side rate limit for sources that ask for one (MusicBrainz: one
 * request per second; iTunes: about 20 per minute). Requests start in the
 * order they were scheduled, and at most `max` of them start in any window of
 * `windowMs`. A request with a `lane` replaces the one of the same lane that
 * is still waiting (latest wins): while the user types, only the last query
 * is sent. Requests already started are never cancelled.
 */

export interface LimiterOptions {
	max: number;
	windowMs: number;
	/** Clock and timer, replaceable in tests. */
	now?: () => number;
	setTimer?: (callback: () => void, ms: number) => void;
}

interface Job {
	lane: string | null;
	start: () => void;
	drop: () => void;
}

export class RequestLimiter {
	private readonly max: number;
	private readonly windowMs: number;
	private readonly now: () => number;
	private readonly setTimer: (callback: () => void, ms: number) => void;
	/** Start times of the latest requests, oldest first (at most `max`). */
	private readonly starts: number[] = [];
	private readonly queue: Job[] = [];
	private waiting = false;

	constructor(options: LimiterOptions) {
		this.max = options.max;
		this.windowMs = options.windowMs;
		this.now = options.now ?? (() => Date.now());
		this.setTimer = options.setTimer ?? ((callback, ms) => void window.setTimeout(callback, ms));
	}

	/** Runs `task` when the limit allows. Rejects with SupersededError if a newer request of `lane` replaced it first. */
	schedule<T>(task: () => Promise<T>, lane?: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			if (lane !== undefined) this.dropLane(lane);
			this.queue.push({
				lane: lane ?? null,
				start: () => {
					Promise.resolve().then(task).then(resolve, reject);
				},
				drop: () => reject(new SupersededError()),
			});
			this.pump();
		});
	}

	private dropLane(lane: string): void {
		for (let index = this.queue.length - 1; index >= 0; index--) {
			const job = this.queue[index];
			if (job?.lane !== lane) continue;
			this.queue.splice(index, 1);
			job.drop();
		}
	}

	/** Milliseconds until the next request may start. */
	private delay(): number {
		if (this.starts.length < this.max) return 0;
		const oldest = this.starts[this.starts.length - this.max] ?? 0;
		return Math.max(0, oldest + this.windowMs - this.now());
	}

	private pump(): void {
		if (this.waiting) return;
		for (;;) {
			if (this.queue.length === 0) return;
			const delay = this.delay();
			if (delay > 0) {
				this.waiting = true;
				this.setTimer(() => {
					this.waiting = false;
					this.pump();
				}, delay);
				return;
			}
			const job = this.queue.shift();
			if (!job) return;
			this.starts.push(this.now());
			if (this.starts.length > this.max) this.starts.shift();
			job.start();
		}
	}
}
