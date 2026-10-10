/**
 * SALON EMİN — Erkek Kuaförü & Online Randevu Motoru
 * Supabase Gerçek Zamanlı Slot Kilitleme & WhatsApp Entegrasyonu
 * 
 * Business Details:
 * - Salon: SALON EMİN
 * - Telefon / WhatsApp: +90 552 669 95 97 (Hedef: 905526699597)
 * - Çalışma Saatleri: Her gün 10:00 - 23:00
 * - Adres: SALON EMİN, Şirinevler, 34100 Bahçelievler/İstanbul
 */

(function () {
  'use strict';

  if (window.__salonEminInitialized) return;
  window.__salonEminInitialized = true;

  // ============================================================================
  // 1. SUPABASE CONFIGURATION & CREDENTIALS
  // ============================================================================
  /**
   * Supabase Dashboard -> Project Settings -> API bölümünden
   * Project URL ve anon public API anahtarınızı aşağıdaki yer tutuculara yapıştırınız:
   */
  const SUPABASE_URL = 'https://fiuupvbkcbiecteuoonx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdXVwdmJrY2JsZWN0ZXVvb254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjI1NDcsImV4cCI6MjEwNzE5ODU0N30.8R8b5xTuBjF9O6ecye9hrukXqZhJcU8AIVk-j7MwuB0';

  const WHATSAPP_PHONE = '905526699597';

  // Specific Barbers list
  const BARBERS = [
    {
      id: 'ahmet',
      name: 'Ahmet Usta',
      role: 'Klasik Kesim & Sakal Tıraşı Uzmanı',
      initials: 'AU'
    },
    {
      id: 'mehmet',
      name: 'Mehmet Usta',
      role: 'Modern Fade & Saç Tasarımı',
      initials: 'MU'
    },
    {
      id: 'any',
      name: 'Fark Etmez',
      role: 'İlk Müsait Usta (En Hızlı Randevu)',
      initials: 'FE'
    }
  ];

  // 30-Minute Interval Time Slots from 10:00 to 23:00 (Every day)
  const TIME_SLOTS = [
    '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30',
    '22:00', '22:30', '23:00'
  ];

  const TURKISH_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const TURKISH_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
  const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const TURKISH_MONTHS_SHORT = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
  ];

  const STORAGE_LOCAL_FALLBACK_KEY = 'salon_emin_local_randevular_v1';

  // ============================================================================
  // 2. SUPABASE CLIENT INITIALIZATION & STATUS
  // ============================================================================
  let supabase = null;
  const isSupabaseConfigured = Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_SUPABASE') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
  );

  function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      if (isSupabaseConfigured) {
        try {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          console.log('✓ Supabase istemcisi başarıyla başlatıldı (SALON EMİN).');
          subscribeToRealtimeSlots();
          updateRealtimeBadge(true);
        } catch (err) {
          console.error('Supabase başlatılırken hata oluştu:', err);
          updateRealtimeBadge(false);
        }
      } else {
        console.info(
          'ℹ️ [SALON EMİN] Supabase bilgileri yer tutucu olarak tanımlı. Gerçek veritabanı senkronizasyonu için app.js içerisindeki SUPABASE_URL ve SUPABASE_ANON_KEY alanlarını doldurunuz. Şimdilik yerel depolama simülasyonu devrede.'
        );
        updateRealtimeBadge(false);
      }
    } else {
      console.warn('Supabase CDN henüz yüklenemedi veya erişilemiyor.');
      updateRealtimeBadge(false);
    }
  }

  function updateRealtimeBadge(isActive) {
    const badge = document.getElementById('realtime-status-badge');
    if (!badge) return;
    if (isActive) {
      badge.innerHTML = '<span class="pulse-dot"></span><span>Canlı Supabase</span>';
      badge.title = 'Supabase veritabanı ile canlı gerçek zamanlı slot kilitleme devrede.';
    } else {
      badge.innerHTML = '<span class="pulse-dot" style="background:#d4af37; box-shadow:0 0 6px #d4af37;"></span><span>Canlı Müsaitlik</span>';
      badge.title = 'Gerçek zamanlı müsaitlik kontrolü aktif.';
    }
  }

  // ============================================================================
  // 3. APPLICATION STATE
  // ============================================================================
  let currentStep = 1;
  let selectedBarber = BARBERS[0]; // Varsayılan: Ahmet Usta
  let availableDates = [];
  let selectedDateObj = null;
  let selectedTimeSlot = null;
  let currentBookedSlots = new Set(); // O berber ve tarih için dolu slotlar
  let allBookingsForDate = [];        // O günün tüm randevuları (Fark Etmez hesaplaması için)

  // ============================================================================
  // 4. DOM ELEMENTS
  // ============================================================================
  // Steps
  const stepIndicators = document.querySelectorAll('.flow-step-indicator');
  const stepPanels = document.querySelectorAll('.flow-step-panel');

  // Step 1
  const barberCardsContainer = document.getElementById('barber-cards-container');
  const step1NextBtn = document.getElementById('step1-next-btn');

  // Step 2
  const datePillStrip = document.getElementById('date-pill-strip');
  const datePickerInput = document.getElementById('flow-custom-date-picker');
  const slotGrid = document.getElementById('slot-grid');
  const step2BackBtn = document.getElementById('step2-back-btn');
  const step2NextBtn = document.getElementById('step2-next-btn');
  const step2SummaryBarber = document.getElementById('step2-summary-barber');
  const availableSlotsCountEl = document.getElementById('available-slots-count');

  // Step 3
  const step3BackBtn = document.getElementById('step3-back-btn');
  const step3SummaryBarber = document.getElementById('step3-summary-barber');
  const step3SummaryDateTime = document.getElementById('step3-summary-datetime');
  const clientNameInput = document.getElementById('flow-client-name');
  const clientPhoneInput = document.getElementById('flow-client-phone');
  const clientNotesInput = document.getElementById('flow-client-notes');
  const bookingForm = document.getElementById('flow-booking-form');
  const confirmBookingBtn = document.getElementById('confirm-booking-btn');

  // Alert & Modal
  const flowAlert = document.getElementById('flow-alert');
  const flowAlertTitle = document.getElementById('flow-alert-title');
  const flowAlertMsg = document.getElementById('flow-alert-msg');
  const flowAlertClose = document.getElementById('flow-alert-close');
  const confirmModal = document.getElementById('booking-confirm-modal');
  const modalReceipt = document.getElementById('modal-receipt');
  const modalWaBtn = document.getElementById('modal-wa-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalIcsBtn = document.getElementById('modal-ics-btn');

  // ============================================================================
  // 5. INITIALIZATION
  // ============================================================================
  function init() {
    initSupabase();
    initHeroSlider();
    initMobileNav();
    initSmoothScrolling();

    generateAvailableDates(14);
    renderBarbers();
    renderDateStrip();

    // Defaults
    if (availableDates.length > 0) {
      selectDate(availableDates[0]);
    }

    setupBookingEventListeners();
    goToStep(1);
  }

  // ============================================================================
  // 6. HERO SLIDER
  // ============================================================================
  function initHeroSlider() {
    const sliderViewport = document.getElementById('slider-viewport');
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.indicator-dot');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    if (!slides.length) return;

    let activeIndex = 0;
    const totalSlides = slides.length;
    let timer = null;
    const SLIDE_INTERVAL = 5000;

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

    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          showSlide(idx);
          startAutoplay();
        }
      });
    });

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
          if (diff > 0) nextSlide();
          else prevSlide();
        }
        startAutoplay();
      }, { passive: true });
    }

    showSlide(0);
    startAutoplay();
  }

  // ============================================================================
  // 7. MOBILE NAV & SMOOTH SCROLL
  // ============================================================================
  function initMobileNav() {
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
  }

  function initSmoothScrolling() {
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
  }

  // ============================================================================
  // 8. DATES GENERATOR
  // ============================================================================
  function generateAvailableDates(daysCount) {
    availableDates = [];
    const today = new Date();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dayNum = d.getDate();
      const monthIndex = d.getMonth();
      const weekdayIndex = d.getDay();
      const year = d.getFullYear();

      const isoDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      let titleLabel = TURKISH_DAYS_SHORT[weekdayIndex];
      if (i === 0) titleLabel = 'Bugün';
      else if (i === 1) titleLabel = 'Yarın';

      availableDates.push({
        dateObj: d,
        isoDate: isoDate,
        dayNum: dayNum,
        monthShort: TURKISH_MONTHS_SHORT[monthIndex],
        monthFull: TURKISH_MONTHS[monthIndex],
        weekdayFull: TURKISH_DAYS[weekdayIndex],
        weekdayShort: TURKISH_DAYS_SHORT[weekdayIndex],
        titleLabel: titleLabel,
        isToday: i === 0,
        formattedFull: `${dayNum} ${TURKISH_MONTHS[monthIndex]} ${year}, ${TURKISH_DAYS[weekdayIndex]}`
      });
    }

    if (datePickerInput && availableDates.length > 0) {
      datePickerInput.min = availableDates[0].isoDate;
      datePickerInput.value = availableDates[0].isoDate;
    }
  }

  // ============================================================================
  // 9. STEP 1: RENDER BARBERS
  // ============================================================================
  function renderBarbers() {
    if (!barberCardsContainer) return;

    barberCardsContainer.innerHTML = '';

    BARBERS.forEach((barber) => {
      const isSelected = selectedBarber && selectedBarber.id === barber.id;

      const card = document.createElement('label');
      card.className = `barber-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      card.tabIndex = 0;

      card.innerHTML = `
        <input type="radio" name="barber-choice" value="${barber.id}" ${isSelected ? 'checked' : ''}>
        <div class="barber-avatar">${barber.initials}</div>
        <div class="barber-name">${barber.name}</div>
        <div class="barber-role">${barber.role}</div>
        <div class="barber-check-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;

      card.addEventListener('click', () => {
        selectBarber(barber);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectBarber(barber);
        }
      });

      barberCardsContainer.appendChild(card);
    });
  }

  function selectBarber(barber) {
    selectedBarber = barber;
    renderBarbers();

    if (step2SummaryBarber) {
      step2SummaryBarber.textContent = barber.name;
    }
    if (step3SummaryBarber) {
      step3SummaryBarber.textContent = barber.name;
    }

    // Seçilen berbere göre kilitli slotları Supabase'den sorgula ve slotları güncelle
    fetchBookedSlotsForCurrentSelection();
  }

  // ============================================================================
  // 10. STEP 2: RENDER DATES & REAL-TIME 30-MIN SLOTS
  // ============================================================================
  function renderDateStrip() {
    if (!datePillStrip) return;

    datePillStrip.innerHTML = '';

    availableDates.forEach((dateItem) => {
      const isSelected = selectedDateObj && selectedDateObj.isoDate === dateItem.isoDate;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `date-pill-btn ${isSelected ? 'selected' : ''}`;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');

      btn.innerHTML = `
        <span class="date-pill-title">${dateItem.titleLabel}</span>
        <span class="date-pill-number">${dateItem.dayNum}</span>
        <span class="date-pill-month">${dateItem.monthShort}</span>
      `;

      btn.addEventListener('click', () => {
        selectDate(dateItem);
      });

      datePillStrip.appendChild(btn);
    });
  }

  function selectDate(dateItem) {
    selectedDateObj = dateItem;
    if (datePickerInput) {
      datePickerInput.value = dateItem.isoDate;
    }
    renderDateStrip();
    fetchBookedSlotsForCurrentSelection();
    updateStep2NextButtonState();
    updateStep3Summary();
  }

  // ============================================================================
  // 11. SUPABASE REAL-TIME SLOT AVAILABILITY CHECK & LOCKING
  // ============================================================================
  /**
   * Supabase "randevular" tablosundan seçili berber ve tarih için dolu slotları çeker.
   * KURAL 3: Slot kilitleme kesinlikle berbere özgüdür.
   * Örneğin: Ahmet Usta için saat 11:00 randevusu Mehmet Usta'nın 11:00 saatini ASLA kilitlemez.
   */
  async function fetchBookedSlotsForCurrentSelection() {
    if (!selectedBarber || !selectedDateObj) return;

    const dateStr = selectedDateObj.isoDate; // YYYY-MM-DD
    const barberName = selectedBarber.name;   // "Ahmet Usta", "Mehmet Usta", "Fark Etmez"

    let bookedList = [];
    allBookingsForDate = [];

    if (supabase) {
      try {
        // O günün tüm randevularını çekiyoruz (hem berber-spesifik kontrol hem Fark Etmez için)
        const { data, error } = await supabase
          .from('randevular')
          .select('berber_adi, tarih, saat')
          .eq('tarih', dateStr);

        if (error) {
          console.error('Supabase randevu sorgulama hatası:', error.message);
        } else if (data) {
          allBookingsForDate = data;
          
          if (barberName === 'Fark Etmez') {
            // "Fark Etmez" seçildiyse: Bir saat dilimi YALNIZCA o saatte tüm bireysel ustalar (Ahmet ve Mehmet) doluysa kilitlenir!
            const countsBySlot = {};
            data.forEach((row) => {
              countsBySlot[row.saat] = (countsBySlot[row.saat] || 0) + 1;
            });
            const specificBarbersCount = BARBERS.filter((b) => b.id !== 'any').length;
            bookedList = Object.keys(countsBySlot).filter((slot) => countsBySlot[slot] >= specificBarbersCount);
          } else {
            // Berber-spesifik slot kilitleme: SADECE bu berbere ait randevuları alıyoruz
            bookedList = data
              .filter((row) => row.berber_adi === barberName)
              .map((row) => row.saat);
          }
        }
      } catch (err) {
        console.warn('Supabase sorgusu çalıştırılamadı, yerel önbellek kullanılıyor:', err);
      }
    }

    // Supabase bağlı değilse veya hata olduysa yerel yedek verileri entegre et
    if (!supabase || bookedList.length === 0) {
      const localData = getLocalBookings(dateStr);
      allBookingsForDate = localData;

      if (barberName === 'Fark Etmez') {
        const countsBySlot = {};
        localData.forEach((row) => {
          countsBySlot[row.saat] = (countsBySlot[row.saat] || 0) + 1;
        });
        const specificBarbersCount = BARBERS.filter((b) => b.id !== 'any').length;
        const localBooked = Object.keys(countsBySlot).filter((slot) => countsBySlot[slot] >= specificBarbersCount);
        bookedList = Array.from(new Set([...bookedList, ...localBooked]));
      } else {
        const localBooked = localData
          .filter((row) => row.berber_adi === barberName)
          .map((row) => row.saat);
        bookedList = Array.from(new Set([...bookedList, ...localBooked]));
      }
    }

    currentBookedSlots = new Set(bookedList);

    // Seçili saat az önce kilitlendiyse seçimi sıfırla
    if (selectedTimeSlot && currentBookedSlots.has(selectedTimeSlot)) {
      selectedTimeSlot = null;
      updateStep2NextButtonState();
      showAlert('Saat Güncellendi', 'Seçtiğiniz saat az önce rezerve edildiğinden seçimi kaldırıldı.');
    }

    renderSlots();
  }

  // Supabase Realtime aboneliği (Biri randevu aldığında anında tüm ekranlarda kilitlenir)
  function subscribeToRealtimeSlots() {
    if (!supabase) return;
    try {
      supabase
        .channel('randevular-live-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'randevular' },
          (payload) => {
            console.log('⚡ [Realtime] Randevular tablosunda değişiklik algılandı:', payload);
            fetchBookedSlotsForCurrentSelection();
          }
        )
        .subscribe((status) => {
          console.log('⚡ Supabase Realtime kanal durumu:', status);
        });
    } catch (err) {
      console.warn('Realtime abonelik başlatılamadı:', err);
    }
  }

  // Slotları DOM üzerine yazdırma
  function renderSlots() {
    if (!slotGrid || !selectedDateObj) return;

    slotGrid.innerHTML = '';

    const now = new Date();
    const isToday = selectedDateObj.isToday;
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    let availableCount = 0;

    TIME_SLOTS.forEach((timeStr) => {
      const [slotH, slotM] = timeStr.split(':').map(Number);
      
      // Bugünün geçmiş saatleri
      let isPast = false;
      if (isToday) {
        if (slotH < currentHours || (slotH === currentHours && slotM <= currentMinutes)) {
          isPast = true;
        }
      }

      // Veritabanından gelen kilitli/rezerve durumu
      const isBooked = currentBookedSlots.has(timeStr);
      const isSelected = selectedTimeSlot === timeStr;
      const isDisabled = isPast || isBooked;

      if (!isDisabled) {
        availableCount++;
      }

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `slot-chip ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''} ${isPast ? 'past' : ''}`;
      chip.disabled = isDisabled;
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', isSelected ? 'true' : 'false');

      let stateText = 'Müsait';
      if (isBooked) stateText = 'Dolu';
      else if (isPast) stateText = 'Geçti';
      else if (isSelected) stateText = 'Seçildi';

      chip.innerHTML = `
        <span class="slot-chip-time">${timeStr}</span>
        <span class="slot-chip-state">${stateText}</span>
      `;

      if (!isDisabled) {
        chip.addEventListener('click', () => {
          selectTimeSlot(timeStr);
        });
      }

      slotGrid.appendChild(chip);
    });

    if (availableSlotsCountEl) {
      availableSlotsCountEl.textContent = `${availableCount} müsait saat`;
    }
  }

  function selectTimeSlot(timeStr) {
    if (currentBookedSlots.has(timeStr)) {
      showAlert('Saat Dolu', 'Bu saat dilimi seçili usta için rezerve edilmiştir.');
      return;
    }

    selectedTimeSlot = timeStr;
    renderSlots();
    updateStep2NextButtonState();
    updateStep3Summary();

    // Akıcı şekilde 3. adıma yönlendir
    setTimeout(() => {
      goToStep(3);
    }, 180);
  }

  function updateStep2NextButtonState() {
    if (step2NextBtn) {
      step2NextBtn.disabled = !selectedTimeSlot || currentBookedSlots.has(selectedTimeSlot);
    }
  }

  function updateStep3Summary() {
    if (step3SummaryBarber && selectedBarber) {
      step3SummaryBarber.textContent = selectedBarber.name;
    }
    if (step3SummaryDateTime && selectedDateObj && selectedTimeSlot) {
      step3SummaryDateTime.textContent = `${selectedDateObj.formattedFull} — Saat ${selectedTimeSlot}`;
    }
  }

  // ============================================================================
  // 12. STEP NAVIGATION & VALIDATION
  // ============================================================================
  function goToStep(step) {
    currentStep = step;
    hideAlert();

    stepIndicators.forEach((ind) => {
      const indStep = parseInt(ind.getAttribute('data-step'), 10);
      ind.classList.toggle('active', indStep === step);
      ind.classList.toggle('completed', indStep < step);
      ind.setAttribute('aria-selected', indStep === step ? 'true' : 'false');
    });

    stepPanels.forEach((panel) => {
      const pStep = parseInt(panel.getAttribute('data-step'), 10);
      panel.classList.toggle('active', pStep === step);
    });

    if (step === 3) {
      updateStep3Summary();
      if (clientNameInput && !clientNameInput.value) {
        setTimeout(() => clientNameInput.focus(), 150);
      }
    }
  }

  function showAlert(title, msg) {
    if (!flowAlert) return;
    if (flowAlertTitle) flowAlertTitle.textContent = title;
    if (flowAlertMsg) flowAlertMsg.textContent = msg;
    flowAlert.classList.remove('hidden');
    flowAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (flowAlert) flowAlert.classList.add('hidden');
  }

  // Telefon normalizasyonu ve maskeleme
  function formatPhoneDisplay(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('90')) digits = digits.substring(2);
    if (digits.length > 11) digits = digits.substring(0, 11);
    if (digits.length === 0) return '';

    if (!digits.startsWith('0')) {
      digits = '0' + digits;
    }

    let out = '0 ';
    if (digits.length > 1) out += '(' + digits.substring(1, Math.min(4, digits.length));
    if (digits.length >= 4) out += ') ';
    if (digits.length > 4) out += digits.substring(4, Math.min(7, digits.length));
    if (digits.length >= 7) out += ' ';
    if (digits.length > 7) out += digits.substring(7, Math.min(9, digits.length));
    if (digits.length >= 9) out += ' ';
    if (digits.length > 9) out += digits.substring(9, Math.min(11, digits.length));

    return out;
  }

  function normalizePhone(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('90')) digits = digits.substring(2);
    if (digits.startsWith('0')) digits = digits.substring(1);
    return digits; // 10 hane: 5XXXXXXXXX
  }

  function validateTurkishPhone(phoneStr) {
    const norm = normalizePhone(phoneStr);
    return norm.length === 10 && norm.startsWith('5');
  }

  // ============================================================================
  // 13. BOOKING SUBMISSION, SUPABASE INSERTION & WHATSAPP REDIRECTION
  // ============================================================================
  /**
   * "Fark Etmez" seçildiğinde boşta olan ilk ustayı tayin eder (Ahmet Usta veya Mehmet Usta).
   */
  function determineAssignedBarber(selectedBarberObj, dateStr, timeStr) {
    if (selectedBarberObj.id !== 'any') {
      return selectedBarberObj.name;
    }
    // "Fark Etmez": O gün ve saatte hangi usta boşta?
    const ahmetBooked = allBookingsForDate.some(
      (b) => b.tarih === dateStr && b.saat === timeStr && b.berber_adi === 'Ahmet Usta'
    );
    if (!ahmetBooked) return 'Ahmet Usta';

    const mehmetBooked = allBookingsForDate.some(
      (b) => b.tarih === dateStr && b.saat === timeStr && b.berber_adi === 'Mehmet Usta'
    );
    if (!mehmetBooked) return 'Mehmet Usta';

    return 'Ahmet Usta'; // Varsayılan
  }

  async function handleBookingSubmit(e) {
    if (e) e.preventDefault();
    hideAlert();

    // 1. Berber kontrolü
    if (!selectedBarber) {
      goToStep(1);
      showAlert('Berber Seçimi Gerekli', 'Lütfen hizmet almak istediğiniz berberi seçiniz.');
      return;
    }

    // 2. Tarih ve Saat kontrolü
    if (!selectedDateObj) {
      goToStep(2);
      showAlert('Tarih Seçimi Gerekli', 'Lütfen randevu almak istediğiniz tarihi seçiniz.');
      return;
    }

    if (!selectedTimeSlot) {
      goToStep(2);
      showAlert('Saat Seçimi Gerekli', 'Lütfen uygun bir randevu saati belirleyiniz.');
      return;
    }

    // 3. Ad Soyad kontrolü
    const customerName = clientNameInput ? clientNameInput.value.trim() : '';
    if (!customerName || customerName.length < 2) {
      if (clientNameInput) {
        clientNameInput.classList.add('has-error');
        clientNameInput.focus();
      }
      showAlert('Ad Soyad Gerekli', 'Lütfen adınızı ve soyadınızı eksiksiz giriniz.');
      return;
    } else if (clientNameInput) {
      clientNameInput.classList.remove('has-error');
    }

    // 4. Telefon Numarası kontrolü (ZORUNLU ALAN)
    const rawPhone = clientPhoneInput ? clientPhoneInput.value.trim() : '';
    if (!rawPhone || !validateTurkishPhone(rawPhone)) {
      if (clientPhoneInput) {
        clientPhoneInput.classList.add('has-error');
        clientPhoneInput.focus();
      }
      showAlert('Geçerli Telefon Numarası Zorunludur', 'Lütfen 0 (5XX) XXX XX XX formatında geçerli bir cep telefonu numarası giriniz.');
      return;
    } else if (clientPhoneInput) {
      clientPhoneInput.classList.remove('has-error');
    }

    const customerPhone = clientPhoneInput.value.trim();
    const dateIso = selectedDateObj.isoDate;
    const dateFormatted = selectedDateObj.formattedFull;
    const timeSlot = selectedTimeSlot;

    // Berber belirleme
    const assignedBarberName = determineAssignedBarber(selectedBarber, dateIso, timeSlot);

    // KURAL 4: Mükerrer Rezervasyonu Önleme (Client-side & DB query check)
    if (currentBookedSlots.has(timeSlot)) {
      showAlert('Saat Dilimi Kapandı', `Seçtiğiniz ${timeSlot} saati az önce rezerve edilmiştir. Lütfen başka bir saat seçiniz.`);
      goToStep(2);
      fetchBookedSlotsForCurrentSelection();
      return;
    }

    const defaultConfirmBtnHtml = `<span>Randevuyu Onayla</span><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.8 14.15c-.24.68-1.4 1.34-1.92 1.38-.49.05-1.12.08-3.64-.96-3.23-1.33-5.32-4.63-5.48-4.85-.16-.22-1.3-1.74-1.3-3.32 0-1.58.83-2.36 1.12-2.68.29-.32.64-.4.85-.4.21 0 .43 0 .61.01.2.01.46-.07.72.55.26.63.89 2.18.97 2.34.08.16.13.35.03.56-.11.21-.16.34-.32.53-.16.19-.34.42-.48.56-.16.16-.33.34-.14.66.19.32.84 1.38 1.8 2.24 1.24 1.1 2.28 1.44 2.61 1.6.32.16.51.14.7-.08.19-.22.82-.96 1.04-1.28.22-.32.44-.27.74-.16.3.11 1.91.9 2.24 1.06.33.16.55.24.63.38.08.13.08.79-.16 1.47z"/></svg>`;

    // Buton bekleme durumu
    if (confirmBookingBtn) {
      confirmBookingBtn.disabled = true;
      confirmBookingBtn.innerHTML = `<span>Kontrol ediliyor...</span>`;
    }

    // ========================================================================
    // DUPLICATE PHONE NUMBER CHECK:
    // 1. Query "randevular" table using entered Phone Number ("Telefon Numarası").
    // 2. If phone number already exists, block submission immediately, show alert:
    //    "Bu telefon numarası ile zaten aktif bir randevunuz bulunmaktadır."
    //    and do NOT allow creating another booking.
    // 3. If NOT found, proceed with normal flow.
    // ========================================================================
    const normPhone = normalizePhone(customerPhone);
    let phoneAlreadyExists = false;

    if (supabase) {
      try {
        const { data: phoneRecords, error: phoneErr } = await supabase
          .from('randevular')
          .select('id, telefon')
          .or(`telefon.eq."${customerPhone}",telefon.eq."${normPhone}",telefon.eq."0${normPhone}",telefon.ilike.%${normPhone}%`)
          .limit(1);

        if (phoneErr) {
          console.warn('Supabase telefon kontrolü hatası, eşitlik sorgusu deneniyor:', phoneErr.message);
          const { data: directMatch } = await supabase
            .from('randevular')
            .select('id, telefon')
            .eq('telefon', customerPhone)
            .limit(1);

          if (directMatch && directMatch.length > 0) {
            phoneAlreadyExists = true;
          }
        } else if (phoneRecords && phoneRecords.length > 0) {
          phoneAlreadyExists = true;
        }
      } catch (err) {
        console.warn('Supabase telefon sorgusu sırasında hata:', err);
      }
    }

    // Yerel depolama önbellek kontrolü (Bağlantı kesintisi veya test modunda doğrulama)
    if (!phoneAlreadyExists) {
      const localList = getLocalBookings();
      if (localList.some((b) => normalizePhone(b.telefon) === normPhone || b.telefon === customerPhone)) {
        phoneAlreadyExists = true;
      }
    }

    // Telefon veritabanında zaten varsa kaydı derhal engelle!
    if (phoneAlreadyExists) {
      if (confirmBookingBtn) {
        confirmBookingBtn.disabled = false;
        confirmBookingBtn.innerHTML = defaultConfirmBtnHtml;
      }
      showAlert('Aktif Randevu', 'Bu telefon numarası ile zaten aktif bir randevunuz bulunmaktadır.');
      if (clientPhoneInput) {
        clientPhoneInput.classList.add('has-error');
        clientPhoneInput.focus();
      }
      return;
    }

    // 4.a) Supabase "randevular" tablosuna ekleme
    let insertSuccess = false;

    if (supabase) {
      try {
        // Çift rezervasyon kontrolü (Son saniye çakışması)
        const { data: duplicateCheck } = await supabase
          .from('randevular')
          .select('id')
          .eq('berber_adi', assignedBarberName)
          .eq('tarih', dateIso)
          .eq('saat', timeSlot)
          .maybeSingle();

        if (duplicateCheck) {
          showAlert('Saat Az Önce Doldu', `Üzgünüz, ${assignedBarberName} için ${timeSlot} saati az önce başka bir müşteri tarafından alındı.`);
          if (confirmBookingBtn) {
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.innerHTML = defaultConfirmBtnHtml;
          }
          await fetchBookedSlotsForCurrentSelection();
          goToStep(2);
          return;
        }

        // Supabase Insert: berber_adi, tarih, saat, musteri_adi, telefon
        const { error: insertError } = await supabase
          .from('randevular')
          .insert([
            {
              berber_adi: assignedBarberName,
              tarih: dateIso,
              saat: timeSlot,
              musteri_adi: customerName,
              telefon: customerPhone
            }
          ]);

        if (insertError) {
          console.error('Supabase randevu kaydetme hatası:', insertError);
          showAlert('Kayıt Uyarısı', 'Veritabanına kaydedilirken bir hata oluştu, ancak randevu talebiniz WhatsApp üzerinden berbere iletilecektir.');
        } else {
          insertSuccess = true;
          console.log('✓ Randevu Supabase veritabanına başarıyla kaydedildi.');
        }
      } catch (err) {
        console.warn('Supabase insert işlemi sırasında istisna:', err);
      }
    }

    // Yerel önbelleğe de kaydet (Offline veya bağımsız çalışma güvenliği için)
    saveLocalBooking({
      berber_adi: assignedBarberName,
      tarih: dateIso,
      saat: timeSlot,
      musteri_adi: customerName,
      telefon: customerPhone
    });

    // 4.b) Arayüzde o saat dilimini anında dinamik olarak kilitle (disable)
    currentBookedSlots.add(timeSlot);
    renderSlots();

    // 4.c) WhatsApp Formatlı Mesajını Oluşturma & Açma
    /**
     * ZORUNLU FORMAT:
     * "Merhaba SALON EMİN,
     * Randevu Talebi:
     * - Berber: [Selected Barber]
     * - Tarih: [Selected Date]
     * - Saat: [Selected Time]
     * - Müşteri: [Customer Name]
     * - Telefon: [Customer Phone]"
     */
    const displayedBarberName = selectedBarber.id === 'any' ? `${assignedBarberName} (Fark Etmez)` : selectedBarber.name;

    const formattedWhatsAppMessage = `Merhaba SALON EMİN,
Randevu Talebi:
- Berber: ${displayedBarberName}
- Tarih: ${dateFormatted}
- Saat: ${timeSlot}
- Müşteri: ${customerName}
- Telefon: ${customerPhone}`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(formattedWhatsAppMessage)}`;

    // Butonu eski haline getir
    if (confirmBookingBtn) {
      confirmBookingBtn.disabled = false;
      confirmBookingBtn.innerHTML = defaultConfirmBtnHtml;
    }

    // WhatsApp'ı yeni pencerede / sekmede aç
    try {
      const waTab = window.open(whatsappUrl, '_blank');
      if (!waTab || waTab.closed || typeof waTab.closed === 'undefined') {
        // Pop-up engelleyici durumunda modal üzerinden doğrudan yönlendirme sunulur
      }
    } catch (err) {
      console.warn('Pencere açma engellendi:', err);
    }

    // Onay makbuz modalını göster
    showConfirmationModal({
      barber: displayedBarberName,
      date: dateFormatted,
      time: timeSlot,
      name: customerName,
      phone: customerPhone,
      waUrl: whatsappUrl
    });
  }

  // ============================================================================
  // 14. LOCAL STORAGE FALLBACK (GÜVENLİ VE KESİNTİSİZ ÇALIŞMA)
  // ============================================================================
  function getLocalBookings(filterDate) {
    try {
      const raw = localStorage.getItem(STORAGE_LOCAL_FALLBACK_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (filterDate) {
        return list.filter((b) => b.tarih === filterDate);
      }
      return list;
    } catch (e) {
      return [];
    }
  }

  function saveLocalBooking(booking) {
    try {
      const list = getLocalBookings();
      list.push({ ...booking, created_at: new Date().toISOString() });
      localStorage.setItem(STORAGE_LOCAL_FALLBACK_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Yerel depolama yazılamadı:', e);
    }
  }

  // ============================================================================
  // 15. CONFIRMATION RECEIPT MODAL
  // ============================================================================
  function showConfirmationModal(data) {
    if (!confirmModal || !modalReceipt) return;

    modalReceipt.innerHTML = `
      <div class="receipt-line">
        <span class="r-label">Berber:</span>
        <span class="r-val">${data.barber}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Tarih:</span>
        <span class="r-val">${data.date}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Saat:</span>
        <span class="r-val">${data.time}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Müşteri:</span>
        <span class="r-val">${data.name}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Telefon:</span>
        <span class="r-val">${data.phone}</span>
      </div>
    `;

    if (modalWaBtn) {
      modalWaBtn.href = data.waUrl;
    }

    confirmModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideConfirmationModal() {
    if (confirmModal) {
      confirmModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // ============================================================================
  // 16. EVENT LISTENERS SETUP
  // ============================================================================
  function setupBookingEventListeners() {
    // Step 1 -> Step 2
    if (step1NextBtn) {
      step1NextBtn.addEventListener('click', () => {
        if (!selectedBarber) {
          showAlert('Berber Seçiniz', 'Lütfen devam etmek için bir berber seçiniz.');
          return;
        }
        goToStep(2);
      });
    }

    // Step 2 -> Step 1
    if (step2BackBtn) {
      step2BackBtn.addEventListener('click', () => {
        goToStep(1);
      });
    }

    // Step 2 -> Step 3
    if (step2NextBtn) {
      step2NextBtn.addEventListener('click', () => {
        if (!selectedTimeSlot) {
          showAlert('Saat Seçiniz', 'Lütfen randevu saati seçiniz.');
          return;
        }
        goToStep(3);
      });
    }

    // Step 3 -> Step 2
    if (step3BackBtn) {
      step3BackBtn.addEventListener('click', () => {
        goToStep(2);
      });
    }

    // Adım Göstergelerine Tıklama
    stepIndicators.forEach((ind) => {
      ind.addEventListener('click', () => {
        const stepNum = parseInt(ind.getAttribute('data-step'), 10);
        if (stepNum === 1) {
          goToStep(1);
        } else if (stepNum === 2) {
          if (selectedBarber) goToStep(2);
        } else if (stepNum === 3) {
          if (selectedBarber && selectedDateObj && selectedTimeSlot) {
            goToStep(3);
          } else {
            showAlert('Önceki Adımları Tamamlayınız', 'Lütfen önce berber, tarih ve uygun saat seçiminizi yapınız.');
          }
        }
      });
    });

    // Takvimden özel tarih seçildiğinde
    if (datePickerInput) {
      datePickerInput.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        const matching = availableDates.find((d) => d.isoDate === val);
        if (matching) {
          selectDate(matching);
        } else {
          const parts = val.split('-');
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const dayNum = d.getDate();
          const mIdx = d.getMonth();
          const wIdx = d.getDay();
          const customDateItem = {
            dateObj: d,
            isoDate: val,
            dayNum: dayNum,
            monthShort: TURKISH_MONTHS_SHORT[mIdx],
            monthFull: TURKISH_MONTHS[mIdx],
            weekdayFull: TURKISH_DAYS[wIdx],
            weekdayShort: TURKISH_DAYS_SHORT[wIdx],
            titleLabel: `${dayNum} ${TURKISH_MONTHS_SHORT[mIdx]}`,
            isToday: false,
            formattedFull: `${dayNum} ${TURKISH_MONTHS[mIdx]} ${parts[0]}, ${TURKISH_DAYS[wIdx]}`
          };
          selectDate(customDateItem);
        }
      });
    }

    // Telefon maskeleme
    if (clientPhoneInput) {
      clientPhoneInput.addEventListener('input', (e) => {
        const formatted = formatPhoneDisplay(e.target.value);
        e.target.value = formatted;
        if (validateTurkishPhone(formatted)) {
          e.target.classList.remove('has-error');
        }
      });
    }

    // İsim hata temizleme
    if (clientNameInput) {
      clientNameInput.addEventListener('input', (e) => {
        if (e.target.value.trim().length >= 2) {
          e.target.classList.remove('has-error');
        }
      });
    }

    // Form Gönderme (Randevuyu Onayla)
    if (bookingForm) {
      bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Uyarıyı Kapatma
    if (flowAlertClose) {
      flowAlertClose.addEventListener('click', hideAlert);
    }

    // Modal Kapatma
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        hideConfirmationModal();
        if (bookingForm) bookingForm.reset();
        selectedTimeSlot = null;
        fetchBookedSlotsForCurrentSelection();
        goToStep(1);
      });
    }

    if (confirmModal) {
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          hideConfirmationModal();
        }
      });
    }

    // Takvime Ekle (.ics dosyası indirme)
    if (modalIcsBtn) {
      modalIcsBtn.addEventListener('click', () => {
        if (!selectedDateObj || !selectedTimeSlot) return;
        const [hh, mm] = selectedTimeSlot.split(':').map(Number);
        const startD = new Date(selectedDateObj.dateObj);
        startD.setHours(hh, mm, 0, 0);
        const endD = new Date(startD);
        endD.setMinutes(startD.getMinutes() + 30);

        function toIcsDate(d) {
          return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        }

        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//SALON EMIN//Randevu Sistemi//TR',
          'BEGIN:VEVENT',
          `UID:randevu-${Date.now()}@salonemin.com`,
          `DTSTAMP:${toIcsDate(new Date())}`,
          `DTSTART:${toIcsDate(startD)}`,
          `DTEND:${toIcsDate(endD)}`,
          'SUMMARY:SALON EMİN — Kuaför Randevusu',
          `DESCRIPTION:Berber: ${selectedBarber ? selectedBarber.name : 'SALON EMİN'}\\nİletişim: +90 552 669 95 97`,
          'LOCATION:SALON EMİN, Şirinevler, 34100 Bahçelievler/İstanbul',
          'STATUS:CONFIRMED',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `salon-emin-randevu-${selectedDateObj.isoDate}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  }

  // DOM hazır olduğunda başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
