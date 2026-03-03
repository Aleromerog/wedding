/**
 * Wedding Carousel — carousel.js
 *
 * Reads images from the photos/ directory (when served via HTTP),
 * or falls back to a manually provided list when opened as a local file.
 *
 * Features:
 *  - Auto-play (5s, pauses on hover)
 *  - Keyboard navigation (← →)
 *  - Touch / swipe support
 *  - Dot indicators
 *  - Slide counter
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG — edit this list when opening index.html as a
     local file (file://) rather than via a web server.
     Leave it empty ([]) to use automatic detection via HTTP.
  ---------------------------------------------------------- */
  const MANUAL_PHOTO_LIST = [
    // 'photos/001_ceremony.jpg',
    // 'photos/002_kiss.jpg',
    // 'photos/003_reception.jpg',
  ];

  const AUTO_PLAY_MS = 5000;          // ms between slides
  const TRANSITION_MS = 600;          // must match CSS fade duration

  /* ----------------------------------------------------------
     State
  ---------------------------------------------------------- */
  let photos = [];
  let current = 0;
  let autoPlayTimer = null;
  let isTransitioning = false;
  let isGalleryOpen = false;

  /* ----------------------------------------------------------
     DOM refs
  ---------------------------------------------------------- */
  const wrapper = document.getElementById('slides-wrapper');
  const dotsEl = document.getElementById('dots');
  const counterCurrent = document.getElementById('counter-current');
  const counterTotal = document.getElementById('counter-total');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnGrid = document.getElementById('btn-grid');
  const galleryOverlay = document.getElementById('gallery-overlay');
  const galleryGrid = document.getElementById('gallery-grid');
  const btnCloseGallery = document.getElementById('btn-close-gallery');
  const btnMusic = document.getElementById('btn-music');
  const bgMusic = document.getElementById('bg-music');
  const iconPlay = document.getElementById('icon-music-play');
  const iconPause = document.getElementById('icon-music-pause');
  const noPhotos = document.getElementById('no-photos');
  const carousel = document.getElementById('carousel');

  /* ----------------------------------------------------------
     Entry point
  ---------------------------------------------------------- */
  async function init() {
    photos = await loadPhotos();

    if (photos.length === 0) {
      noPhotos.classList.remove('hidden');
      carousel.style.display = 'none';
      document.getElementById('intro-overlay').style.animation = 'none';
      document.getElementById('intro-overlay').style.opacity = '0';
      return;
    }

    buildSlides();
    buildGallery();
    buildDots();
    updateCounter();
    bindEvents();
    startAutoPlay();
  }

  /* ----------------------------------------------------------
     Photo loading
  ---------------------------------------------------------- */
  async function loadPhotos() {
    // 1. Use manual list if provided
    if (MANUAL_PHOTO_LIST.length > 0) {
      return MANUAL_PHOTO_LIST;
    }

    // 2. Try fetching the directory listing (works on GitHub Pages
    //    and local servers like `npx serve .`)
    try {
      const res = await fetch('photos/');
      if (!res.ok) throw new Error('Directory listing unavailable');
      const text = await res.text();

      // Parse links from directory listing HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const links = Array.from(doc.querySelectorAll('a[href]'));

      const imageExts = /\.(jpe?g|png|webp|gif|avif)$/i;
      const found = links
        .map(a => decodeURIComponent(a.getAttribute('href')))
        .filter(href => imageExts.test(href) && !href.startsWith('..'))
        .map(href => 'photos/' + href.replace(/^photos\//, ''));

      return found.sort();
    } catch {
      return [];
    }
  }

  /* ----------------------------------------------------------
     Build slides
  ---------------------------------------------------------- */
  function buildSlides() {
    photos.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide' + (i === 0 ? ' active' : '');
      slide.setAttribute('role', 'tabpanel');
      slide.setAttribute('aria-label', `Photo ${i + 1} of ${photos.length}`);

      // Blurred background layer (same photo, cover + blur)
      const bg = document.createElement('div');
      bg.className = 'slide-bg';
      bg.style.backgroundImage = `url('${src}')`;

      // Main image (contain — full photo visible, no cropping)
      const img = document.createElement('img');
      img.className = 'slide-img';
      img.src = src;
      img.alt = `Wedding photo ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.draggable = false;

      slide.appendChild(bg);
      slide.appendChild(img);
      wrapper.appendChild(slide);
    });
  }

  /* ----------------------------------------------------------
     Gallery
  ---------------------------------------------------------- */
  function buildGallery() {
    if (!galleryGrid) return;
    
    photos.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item' + (i === 0 ? ' active' : '');
      item.addEventListener('click', () => {
        goTo(i);
        closeGallery();
      });

      const img = document.createElement('img');
      img.src = src;
      img.loading = 'lazy';
      img.alt = `Thumbnail ${i + 1}`;

      item.appendChild(img);
      galleryGrid.appendChild(item);
    });
  }

  function updateGalleryActive() {
    if (!galleryGrid) return;
    const items = galleryGrid.querySelectorAll('.gallery-item');
    items.forEach((item, i) => item.classList.toggle('active', i === current));
  }

  function openGallery() {
    if (isGalleryOpen) return;
    isGalleryOpen = true;
    galleryOverlay.classList.remove('hidden');
    stopAutoPlay();
    updateGalleryActive();
    
    // Scroll active item into view
    const activeItem = galleryGrid.querySelector('.gallery-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function closeGallery() {
    if (!isGalleryOpen) return;
    isGalleryOpen = false;
    galleryOverlay.classList.add('hidden');
    startAutoPlay();
  }

  /* ----------------------------------------------------------
     Dots
  ---------------------------------------------------------- */
  function buildDots() {
    // Only show dots for manageable numbers of slides
    const MAX_DOTS = 20;
    if (photos.length > MAX_DOTS) return;

    photos.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    });
  }

  function updateDots() {
    const dotEls = dotsEl.querySelectorAll('.dot');
    dotEls.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  /* ----------------------------------------------------------
     Counter
  ---------------------------------------------------------- */
  function updateCounter() {
    counterCurrent.textContent = current + 1;
    counterTotal.textContent = photos.length;
  }

  /* ----------------------------------------------------------
     Navigation
  ---------------------------------------------------------- */
  function goTo(index) {
    if (isTransitioning || index === current) return;
    isTransitioning = true;

    const slides = wrapper.querySelectorAll('.slide');
    slides[current].classList.remove('active');
    current = (index + photos.length) % photos.length;
    slides[current].classList.add('active');

    updateDots();
    updateCounter();
    updateGalleryActive();

    setTimeout(() => { isTransitioning = false; }, TRANSITION_MS);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  /* ----------------------------------------------------------
     Auto-play
  ---------------------------------------------------------- */
  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(next, AUTO_PLAY_MS);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) clearInterval(autoPlayTimer);
  }

  /* ----------------------------------------------------------
     Event binding
  ---------------------------------------------------------- */
  function bindEvents() {
    btnNext.addEventListener('click', () => { next(); startAutoPlay(); });
    btnPrev.addEventListener('click', () => { prev(); startAutoPlay(); });
    if (btnGrid) btnGrid.addEventListener('click', openGallery);
    if (btnCloseGallery) btnCloseGallery.addEventListener('click', closeGallery);

    let isMusicPlaying = false;

    function toggleMusic(forcePlay = null) {
      if (!bgMusic) return;
      
      const shouldPlay = forcePlay !== null ? forcePlay : !isMusicPlaying;
      
      if (shouldPlay) {
        bgMusic.play().then(() => {
          isMusicPlaying = true;
          iconPlay.style.display = 'none';
          iconPause.style.display = 'block';
        }).catch(e => {
          console.log("Playback blocked by browser. Waiting for interaction.");
        });
      } else {
        bgMusic.pause();
        isMusicPlaying = false;
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
      }
    }

    if (btnMusic && bgMusic) {
      btnMusic.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the document listener from firing
        toggleMusic();
      });
    }

    // Auto-play attempt on start
    toggleMusic(true);

    // Fallback: Start music on first user interaction (click, scroll, or keypress)
    const autoPlayOnInteraction = () => {
      if (!isMusicPlaying) toggleMusic(true);
      document.removeEventListener('click', autoPlayOnInteraction);
      document.removeEventListener('keydown', autoPlayOnInteraction);
      document.removeEventListener('touchstart', autoPlayOnInteraction);
    };

    document.addEventListener('click', autoPlayOnInteraction);
    document.addEventListener('keydown', autoPlayOnInteraction);
    document.addEventListener('touchstart', autoPlayOnInteraction);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (isGalleryOpen) {
        if (e.key === 'Escape') closeGallery();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next(); startAutoPlay(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { prev(); startAutoPlay(); }
    });

    // Pause on hover
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);

    // Touch / swipe
    let touchStartX = 0;
    let touchStartY = 0;

    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        dx < 0 ? next() : prev();
        startAutoPlay();
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Go!
  ---------------------------------------------------------- */
  init();
})();
