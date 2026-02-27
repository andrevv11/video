import { Gallery } from './gallery';
import type { Video } from './types';

// ─── Video Config ──────────────────────────────────────────────────────────────
// Add your own video filenames here. Place MP4 files in public/videos/.
// Relative paths work on both localhost and GitHub Pages.
const VIDEOS: Video[] = [
  { url: 'videos/sri_lanka.mov',       title: 'Sri Lanka'        },
  { url: 'videos/uk_glastonbury.mp4',  title: 'UK · Glastonbury' },
  { url: 'videos/India.mov',            title: 'India'            },
];
// ──────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const gallery = new Gallery(VIDEOS);
  gallery.init();

  // ── Tap zones ──────────────────────────────────────────────────────────────
  document.getElementById('tap-right')!.addEventListener('click', () => {
    void gallery.goNext();
  });

  document.getElementById('tap-left')!.addEventListener('click', () => {
    void gallery.goPrev();
  });

  // ── Unmute button ──────────────────────────────────────────────────────────
  document.getElementById('unmute-btn')!.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent tap zone from also firing
    gallery.toggleMute();
  });

  // ── Swipe gestures ─────────────────────────────────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    const SWIPE_MIN_PX = 50;
    const AXIS_DOMINANCE = 1.2; // horizontal must be 1.2× vertical to qualify

    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dy) > Math.abs(dx) / AXIS_DOMINANCE) return; // too vertical

    if (dx < 0) {
      void gallery.goNext(); // swipe left → next
    } else {
      void gallery.goPrev(); // swipe right → prev
    }
  }, { passive: true });

  // ── Keyboard (desktop / iPad keyboard) ────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      void gallery.goNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      void gallery.goPrev();
    }
  });
});
