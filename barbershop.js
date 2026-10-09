/**
 * Cadde Erkek Kuaförü — Sade & Fonksiyonel Web Sitesi Betiği
 * Özellikler: Minimalist görsel kaydırıcı (slider), mobil menü ve yumuşak kaydırma.
 */

(function () {
  'use strict';

  // --- 1. MINIMALIST GÖRSEL SLIDER ---
  const sliderViewport = document.getElementById('slider-viewport');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.indicator-dot');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');

  let activeIndex = 0;
  const totalSlides = slides.length;
  let timer = null;
  const SLIDE_INTERVAL = 5500; // 5.5 saniye

  function showSlide(index) {
    if (index < 0) {
      index = totalSlides - 1;
    } else if (index >= totalSlides) {
      index = 0;
    }

    activeIndex = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === activeIndex);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIndex);
    });
  }

  function nextSlide() {
    showSlide(activeIndex + 1);
  }

  function prevSlide() {
    showSlide(activeIndex - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(nextSlide, SLIDE_INTERVAL);
  }

  function stopAutoplay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Buton dinleyicileri
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      startAutoplay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      startAutoplay();
    });
  }

  // Nokta göstergeleri dinleyicileri
  dots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      if (!isNaN(idx)) {
        showSlide(idx);
        startAutoplay();
      }
    });
  });

  // Fare üzerine gelince duraklatma ve mobil dokunmatik kaydırma
  if (sliderViewport) {
    sliderViewport.addEventListener('mouseenter', stopAutoplay);
    sliderViewport.addEventListener('mouseleave', startAutoplay);

    let startX = 0;
    sliderViewport.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].screenX;
      stopAutoplay();
    }, { passive: true });

    sliderViewport.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].screenX;
      const diff = startX - endX;
      if (Math.abs(diff) > 35) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
      startAutoplay();
    }, { passive: true });
  }

  // --- 2. MOBİL MENÜ YÖNETİMİ ---
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- 3. DAHİLİ BAĞLANTILAR İÇİN YUMUŞAK KAYDIRMA ---
  const internalLinks = document.querySelectorAll('a[href^="#"]');
  internalLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Başlangıç
  showSlide(0);
  startAutoplay();
})();
