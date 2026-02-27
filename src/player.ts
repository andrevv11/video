export class VideoPlayer {
  private el: HTMLVideoElement;

  constructor(el: HTMLVideoElement) {
    this.el = el;
  }

  get videoEl(): HTMLVideoElement {
    return this.el;
  }

  get readyState(): number {
    return this.el.readyState;
  }

  get currentSrc(): string {
    return this.el.src;
  }

  load(url: string): void {
    // Abort any in-flight network request for the previous source
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
    this.el.src = url;
    this.el.preload = 'auto';
    this.el.load();
  }

  play(): Promise<void> {
    return this.el.play();
  }

  pause(): void {
    this.el.pause();
  }

  seekToStart(): void {
    this.el.currentTime = 0;
  }

  setMuted(muted: boolean): void {
    this.el.muted = muted;
  }

  get muted(): boolean {
    return this.el.muted;
  }

  waitForCanPlay(): Promise<void> {
    if (this.el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const handler = () => {
        this.el.removeEventListener('canplay', handler);
        this.el.removeEventListener('error', handler);
        resolve();
      };
      this.el.addEventListener('canplay', handler, { once: true });
      this.el.addEventListener('error', handler, { once: true });
    });
  }

  on<K extends keyof HTMLMediaElementEventMap>(
    event: K,
    handler: (e: HTMLMediaElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void {
    this.el.addEventListener(event, handler, options);
  }
}
