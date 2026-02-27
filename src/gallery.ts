import { VideoPlayer } from './player';
import type { Video, PanelId, GalleryState } from './types';

const SLIDE_DURATION = 840;
const SLIDE_EASING = 'ease-in-out';

export class Gallery {
  private state: GalleryState;
  private players: Record<PanelId, VideoPlayer>;
  private panelEls: Record<PanelId, HTMLElement>;
  private loadingOverlay: HTMLElement;
  private unmuteBtn: HTMLButtonElement;
  private fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(videos: Video[]) {
    this.state = {
      playlist: [...videos],
      current: 0,
      activePanel: 'a',
      isSliding: false,
      isMuted: true,
    };

    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.unmuteBtn = document.getElementById('unmute-btn') as HTMLButtonElement;

    this.panelEls = {
      a: document.getElementById('panel-a')!,
      b: document.getElementById('panel-b')!,
    };

    this.players = {
      a: new VideoPlayer(document.getElementById('video-a') as HTMLVideoElement),
      b: new VideoPlayer(document.getElementById('video-b') as HTMLVideoElement),
    };
  }

  init(): void {
    const { playlist } = this.state;

    if (playlist.length === 0) {
      this.showError('No videos configured. Add entries to the VIDEOS list in src/main.ts.');
      return;
    }

    // Active panel starts at 0%, inactive starts off-screen right
    this.setPanelX('a', '0%', false);
    this.setPanelX('b', '100%', false);

    // Load first video into active panel
    const activePlayer = this.players[this.state.activePanel];
    activePlayer.load(playlist[0].url);
    activePlayer.setMuted(true);

    // Preload second video into inactive panel (off-screen right)
    if (playlist.length > 1) {
      this.preload('b', 1);
    }

    // Show loading if first video isn't buffered yet
    if (activePlayer.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      this.showLoading();
    }

    activePlayer.waitForCanPlay().then(() => {
      this.hideLoading();
      activePlayer.play().catch(() => {/* autoplay blocked, waiting for user interaction */});
    });

    // Wire video events
    for (const id of ['a', 'b'] as PanelId[]) {
      const p = this.players[id];
      p.on('waiting', () => { if (id === this.state.activePanel) this.showLoading(); });
      p.on('playing', () => { if (id === this.state.activePanel) this.hideLoading(); });
      p.on('canplay', () => { if (id === this.state.activePanel) this.hideLoading(); });
      p.on('ended', () => { if (id === this.state.activePanel) void this.goNext(); });
      // When near the end, ensure next video is buffered
      p.on('timeupdate', () => {
        if (id !== this.state.activePanel || this.state.isSliding) return;
        const el = p.videoEl;
        if (el.duration && el.currentTime > el.duration * 0.75) {
          const nextIndex = (this.state.current + 1) % this.state.playlist.length;
          this.preload(this.inactivePanel, nextIndex);
        }
      });
    }

    this.updateTitle();
    this.updateUnmuteBtn();
  }

  goNext(): Promise<void> {
    return this.navigate('next');
  }

  goPrev(): Promise<void> {
    return this.navigate('prev');
  }

  toggleMute(): void {
    this.state.isMuted = !this.state.isMuted;
    this.players[this.state.activePanel].setMuted(this.state.isMuted);
    this.updateUnmuteBtn();
  }

  private get inactivePanel(): PanelId {
    return this.state.activePanel === 'a' ? 'b' : 'a';
  }

  private preload(panelId: PanelId, index: number): void {
    const { playlist } = this.state;
    if (index < 0 || index >= playlist.length) return;
    const url = playlist[index].url;
    const player = this.players[panelId];
    // Only reload if different video
    if (!player.currentSrc.endsWith(url)) {
      player.load(url);
      player.setMuted(true);
    }
  }

  private async navigate(direction: 'next' | 'prev'): Promise<void> {
    if (this.state.isSliding) return;

    const { playlist } = this.state;
    let targetIndex: number;
    if (direction === 'next') {
      targetIndex = (this.state.current + 1) % playlist.length;
    } else {
      targetIndex = (this.state.current - 1 + playlist.length) % playlist.length;
    }

    this.state.isSliding = true;

    const active = this.state.activePanel;
    const incoming = this.inactivePanel;
    const incomingPlayer = this.players[incoming];

    // Ensure incoming panel has the right video
    const url = playlist[targetIndex].url;
    if (!incomingPlayer.currentSrc.endsWith(url)) {
      incomingPlayer.load(url);
    }

    // Wait for buffer if needed
    if (incomingPlayer.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      this.showLoading();
      await incomingPlayer.waitForCanPlay();
      this.hideLoading();
    }

    if (direction === 'prev') {
      // Teleport incoming panel to the LEFT (off-screen left) without animation
      this.setPanelX(incoming, '-100%', false);
      // Force reflow so browser registers position
      this.panelEls[incoming].getBoundingClientRect();
    }
    // For 'next', incoming is already at 100% (off-screen right) — no repositioning needed

    // Start the slide animation on both panels simultaneously
    const incomingTargetX = '0%';
    const activeTargetX = direction === 'next' ? '-100%' : '100%';

    this.setPanelX(incoming, incomingTargetX, true);
    this.setPanelX(active, activeTargetX, true);

    // Fallback in case transitionend doesn't fire (e.g., tab backgrounded)
    this.fallbackTimeout = setTimeout(() => this.onTransitionEnd(active, incoming, targetIndex), SLIDE_DURATION + 150);

    // Wait for transition
    await new Promise<void>((resolve) => {
      this.panelEls[incoming].addEventListener('transitionend', () => resolve(), { once: true });
    });

    this.onTransitionEnd(active, incoming, targetIndex);
  }

  private onTransitionEnd(outgoing: PanelId, incoming: PanelId, newIndex: number): void {
    if (this.fallbackTimeout !== null) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }

    // Guard against double-firing (fallback + transitionend both resolving)
    if (!this.state.isSliding) return;

    // Swap active panel
    this.state.activePanel = incoming;
    this.state.current = newIndex;

    // Pause outgoing, play incoming with correct mute state
    this.players[outgoing].pause();
    const incomingPlayer = this.players[incoming];
    incomingPlayer.setMuted(this.state.isMuted);
    incomingPlayer.play().catch(() => {/* ok */});

    // Reposition outgoing panel off-screen right (ready for next goNext preload)
    this.setPanelX(outgoing, '100%', false);

    // Preload next video into outgoing (now off-screen right)
    const preloadIndex = (this.state.current + 1) % this.state.playlist.length;
    this.preload(outgoing, preloadIndex);

    this.state.isSliding = false;
    this.updateTitle();
  }

  private setPanelX(panelId: PanelId, x: string, animate: boolean): void {
    const el = this.panelEls[panelId];
    el.style.transition = animate
      ? `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}`
      : 'none';
    el.style.transform = `translateX(${x})`;
  }

  private showLoading(): void {
    this.loadingOverlay.classList.add('visible');
  }

  private hideLoading(): void {
    this.loadingOverlay.classList.remove('visible');
  }

  private updateTitle(): void {
    const video = this.state.playlist[this.state.current];
    if (video?.title) {
      document.title = video.title;
    }
  }

  private updateUnmuteBtn(): void {
    this.unmuteBtn.textContent = this.state.isMuted ? '🔇' : '🔊';
    this.unmuteBtn.setAttribute('aria-label', this.state.isMuted ? 'Unmute' : 'Mute');
  }

  private showError(msg: string): void {
    document.body.innerHTML = `
      <div style="
        position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
        background:#000;color:#fff;font-family:system-ui,sans-serif;
        padding:40px;text-align:center;line-height:1.5;
      ">
        <div>
          <h2 style="margin-bottom:12px;font-size:18px">Video Gallery</h2>
          <p style="opacity:0.6;font-size:14px">${msg}</p>
        </div>
      </div>`;
  }
}
