/**
 * Emin Berber — 3 Adımlı Etkileşimli Randevu Motoru (Booking Flow)
 * Adım 1: Berber Seçimi (Emin Usta, Ahmet Usta, Fark Etmez)
 * Adım 2: Tarih & 30 Dakikalık Saat Dilimi Seçimi (Slot Otomatik Kapanışı)
 * Adım 3: İletişim Bilgileri (Zorunlu Telefon & Günde 1 Randevu Kuralı)
 */

(function () {
  'use strict';

  // --- CONFIGURATION ---
  const BARBERS = [
    {
      id: 'emin',
      name: 'Emin Usta',
      role: 'Klasik Kesim & Sakal Tıraşı',
      initials: 'EU'
    },
    {
      id: 'ahmet',
      name: 'Ahmet Usta',
      role: 'Modern Kesim & Fade',
      initials: 'AU'
    },
    {
      id: 'any',
      name: 'Fark Etmez',
      role: 'İlk Müsait Usta',
      initials: 'F'
    }
  ];

  // 30-minute interval slots from 10:00 to 19:30
  const TIME_SLOTS = [
    '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30'
  ];

  const STORAGE_KEY = 'emin_berber_appointments_v1';

  const TURKISH_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
  const TURKISH_MONTHS_SHORT = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
  ];
  const TURKISH_MONTHS_FULL = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // State
  let currentStep = 1;
  let selectedBarber = null; // barber object
  let availableDates = [];
  let selectedDateObj = null;
  let selectedTimeSlot = null;
  let appointments = [];
  let lastConfirmed = null;

  // DOM Elements
  const stepIndicators = document.querySelectorAll('.flow-step-indicator');
  const stepPanels = document.querySelectorAll('.flow-step-panel');

  // Step 1
  const barberCardsContainer = document.getElementById('barber-cards-container');
  const step1NextBtn = document.getElementById('step1-next-btn');

  // Step 2
  const datePillStrip = document.getElementById('date-pill-strip');
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

  // Alert & Modal
  const flowAlert = document.getElementById('flow-alert');
  const flowAlertTitle = document.getElementById('flow-alert-title');
  const flowAlertMsg = document.getElementById('flow-alert-msg');
  const flowAlertClose = document.getElementById('flow-alert-close');
  const confirmModal = document.getElementById('booking-confirm-modal');
  const modalReceipt = document.getElementById('modal-receipt');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalIcsBtn = document.getElementById('modal-ics-btn');

  // --- INITIALIZATION ---
  function init() {
    loadAppointments();
    seedInitialDemoDataIfEmpty();
    generateDateList(14);
    renderBarbers();
    renderDates();

    // Default select first barber option: "Fark Etmez" or "Ahmet Usta"
    selectBarber(BARBERS[0]);
    selectDate(availableDates[0]);

    setupEventListeners();
    goToStep(1);
  }

  // --- STORAGE ---
  function loadAppointments() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      appointments = data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('LocalStorage okunamadı:', e);
      appointments = [];
    }
  }

  function saveAppointments() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch (e) {
      console.error('LocalStorage yazılamadı:', e);
    }
  }

  function seedInitialDemoDataIfEmpty() {
    if (!appointments || appointments.length === 0) {
      const today = new Date();
      const todayStr = formatDateIso(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = formatDateIso(tomorrow);

      appointments = [
        {
          id: 'RND-10492',
          barberId: 'emin',
          barberName: 'Emin Usta',
          date: todayStr,
          time: '11:00',
          name: 'Emre K. (Demo)',
          phone: '05321112233',
          createdAt: new Date().toISOString()
        },
        {
          id: 'RND-10493',
          barberId: 'ahmet',
          barberName: 'Ahmet Usta',
          date: todayStr,
          time: '14:30',
          name: 'Burak S. (Demo)',
          phone: '05442223344',
          createdAt: new Date().toISOString()
        },
        {
          id: 'RND-10494',
          barberId: 'emin',
          barberName: 'Emin Usta',
          date: tomorrowStr,
          time: '12:00',
          name: 'Can T. (Demo)',
          phone: '05553334455',
          createdAt: new Date().toISOString()
        }
      ];
      saveAppointments();
    }
  }

  // --- DATES ---
  function formatDateIso(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateDateList(daysCount) {
    availableDates = [];
    const today = new Date();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      // Skip Sunday (Business closed on Sundays)
      if (d.getDay() === 0) {
        continue;
      }

      const iso = formatDateIso(d);
      let dayTitle = '';
      if (i === 0) dayTitle = 'Bugün';
      else if (i === 1) dayTitle = 'Yarın';
      else dayTitle = TURKISH_DAYS_SHORT[d.getDay()];

      availableDates.push({
        dateString: iso,
        dayNum: d.getDate(),
        dayTitle: dayTitle,
        weekday: TURKISH_DAYS_SHORT[d.getDay()],
        monthShort: TURKISH_MONTHS_SHORT[d.getMonth()],
        monthFull: TURKISH_MONTHS_FULL[d.getMonth()],
        isToday: (i === 0),
        rawDate: d
      });
    }
  }

  // --- STEP 1: RENDER BARBERS ---
  function renderBarbers() {
    if (!barberCardsContainer) return;
    barberCardsContainer.innerHTML = '';

    BARBERS.forEach((barber) => {
      const card = document.createElement('div');
      card.className = 'barber-card';
      card.setAttribute('data-barber-id', barber.id);
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', selectedBarber && selectedBarber.id === barber.id ? 'true' : 'false');

      card.innerHTML = `
        <div class="barber-avatar">${barber.initials}</div>
        <div class="barber-info">
          <h4 class="barber-name">${barber.name}</h4>
          <p class="barber-role">${barber.role}</p>
        </div>
        <div class="barber-check-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;

      card.addEventListener('click', () => {
        selectBarber(barber);
      });

      barberCardsContainer.appendChild(card);
    });
  }

  function selectBarber(barber) {
    selectedBarber = barber;

    const cards = barberCardsContainer ? barberCardsContainer.querySelectorAll('.barber-card') : [];
    cards.forEach((c) => {
      const isSel = c.getAttribute('data-barber-id') === barber.id;
      c.classList.toggle('selected', isSel);
      c.setAttribute('aria-checked', isSel ? 'true' : 'false');
    });

    if (step1NextBtn) {
      step1NextBtn.disabled = false;
    }

    if (step2SummaryBarber) {
      step2SummaryBarber.textContent = barber.name;
    }
    if (step3SummaryBarber) {
      step3SummaryBarber.textContent = barber.name;
    }

    // Refresh slots if on step 2
    renderSlots();
  }

  // --- STEP 2: RENDER DATES & TIME SLOTS ---
  function renderDates() {
    if (!datePillStrip) return;
    datePillStrip.innerHTML = '';

    availableDates.forEach((dateItem) => {
      const pill = document.createElement('div');
      pill.className = 'date-pill-btn';
      pill.setAttribute('data-date', dateItem.dateString);
      pill.setAttribute('role', 'radio');

      pill.innerHTML = `
        <span class="date-pill-title">${dateItem.dayTitle}</span>
        <span class="date-pill-number">${dateItem.dayNum}</span>
        <span class="date-pill-month">${dateItem.monthShort}</span>
      `;

      pill.addEventListener('click', () => {
        selectDate(dateItem);
      });

      datePillStrip.appendChild(pill);
    });
  }

  function selectDate(dateItem) {
    selectedDateObj = dateItem;
    selectedTimeSlot = null;

    if (datePillStrip) {
      const pills = datePillStrip.querySelectorAll('.date-pill-btn');
      pills.forEach((p) => {
        const isSel = p.getAttribute('data-date') === dateItem.dateString;
        p.classList.toggle('selected', isSel);
        p.setAttribute('aria-checked', isSel ? 'true' : 'false');
      });
    }

    renderSlots();
    if (step2NextBtn) {
      step2NextBtn.disabled = true;
    }
    hideAlert();
  }

  function renderSlots() {
    if (!slotGrid || !selectedDateObj) return;
    slotGrid.innerHTML = '';

    const chosenDateStr = selectedDateObj.dateString;

    // Filter booked slots on this date
    // If a specific barber is chosen, check bookings for that barber (or 'any')
    const bookedOnDate = appointments.filter((a) => {
      if (a.date !== chosenDateStr) return false;
      if (!selectedBarber || selectedBarber.id === 'any') {
        return true; // Any barber booked slot is marked
      }
      return a.barberId === selectedBarber.id || a.barberId === 'any';
    });

    const bookedTimes = new Set(bookedOnDate.map(a => a.time));
    let availableCount = 0;

    TIME_SLOTS.forEach((slotTime) => {
      const isBooked = bookedTimes.has(slotTime);
      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.className = 'slot-chip';
      slotBtn.setAttribute('data-time', slotTime);

      if (isBooked) {
        // Disabled & marked booked
        slotBtn.classList.add('booked');
        slotBtn.disabled = true;
        slotBtn.setAttribute('aria-disabled', 'true');
        slotBtn.innerHTML = `
          <span class="slot-chip-time">${slotTime}</span>
          <span class="slot-chip-state">Dolu</span>
        `;
      } else {
        availableCount++;
        const isSelected = (selectedTimeSlot === slotTime);
        if (isSelected) {
          slotBtn.classList.add('selected');
        }

        slotBtn.innerHTML = `
          <span class="slot-chip-time">${slotTime}</span>
          <span class="slot-chip-state">${isSelected ? 'Seçildi' : 'Müsait'}</span>
        `;

        slotBtn.addEventListener('click', () => {
          selectSlot(slotTime);
        });
      }

      slotGrid.appendChild(slotBtn);
    });

    if (availableSlotsCountEl) {
      availableSlotsCountEl.textContent = `${availableCount} müsait saat`;
    }
  }

  function selectSlot(slotTime) {
    selectedTimeSlot = slotTime;

    if (slotGrid) {
      const chips = slotGrid.querySelectorAll('.slot-chip:not(.booked)');
      chips.forEach((c) => {
        const isSel = c.getAttribute('data-time') === slotTime;
        c.classList.toggle('selected', isSel);
        const stateSpan = c.querySelector('.slot-chip-state');
        if (stateSpan) {
          stateSpan.textContent = isSel ? 'Seçildi' : 'Müsait';
        }
      });
    }

    if (step2NextBtn) {
      step2NextBtn.disabled = false;
    }
    hideAlert();
  }

  // --- STEP NAVIGATION ---
  function goToStep(stepNum) {
    currentStep = stepNum;

    // Update Step Indicators
    stepIndicators.forEach((ind) => {
      const s = parseInt(ind.getAttribute('data-step'), 10);
      ind.classList.toggle('active', s === currentStep);
      ind.classList.toggle('completed', s < currentStep);
    });

    // Update Panels
    stepPanels.forEach((panel) => {
      const s = parseInt(panel.getAttribute('data-step'), 10);
      panel.classList.toggle('active', s === currentStep);
    });

    // Step 3 summary update
    if (stepNum === 3) {
      if (step3SummaryBarber && selectedBarber) {
        step3SummaryBarber.textContent = selectedBarber.name;
      }
      if (step3SummaryDateTime && selectedDateObj && selectedTimeSlot) {
        step3SummaryDateTime.textContent = `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday}, Saat: ${selectedTimeSlot}`;
      }
    }

    hideAlert();

    // Scroll to top of widget container
    const widget = document.getElementById('booking-selector-widget');
    if (widget) {
      widget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- PHONE SANITIZATION & STRICT FORMAT ---
  function normalizePhone(val) {
    if (!val) return '';
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length >= 12) {
      digits = digits.substring(2);
    }
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    return digits; // 10 digits (5XXXXXXXXX)
  }

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

  function validateTurkishPhone(phoneStr) {
    const norm = normalizePhone(phoneStr);
    return norm.length === 10 && norm.startsWith('5');
  }

  // --- STEP 3: SUBMIT & VALIDATION ---
  function handleBookingSubmit(e) {
    e.preventDefault();
    hideAlert();

    if (!selectedBarber) {
      goToStep(1);
      return;
    }

    if (!selectedDateObj || !selectedTimeSlot) {
      goToStep(2);
      return;
    }

    const nameVal = clientNameInput.value.trim();
    if (!nameVal || nameVal.length < 2) {
      clientNameInput.classList.add('has-error');
      showAlert('Eksik Bilgi', 'Lütfen adınızı ve soyadınızı belirtiniz.');
      clientNameInput.focus();
      return;
    } else {
      clientNameInput.classList.remove('has-error');
    }

    const rawPhone = clientPhoneInput.value;
    if (!validateTurkishPhone(rawPhone)) {
      clientPhoneInput.classList.add('has-error');
      showAlert('Geçersiz Telefon', 'Telefon alanı zorunludur. Lütfen 0 (5XX) XXX XX XX formatında geçerli bir cep telefonu giriniz.');
      clientPhoneInput.focus();
      return;
    } else {
      clientPhoneInput.classList.remove('has-error');
    }

    const normPhone = normalizePhone(rawPhone);
    const chosenDateStr = selectedDateObj.dateString;

    // RULE A: Check if slot was booked just now
    const isTaken = appointments.some(
      a => a.date === chosenDateStr && a.time === selectedTimeSlot && (a.barberId === selectedBarber.id || selectedBarber.id === 'any')
    );
    if (isTaken) {
      showAlert('Saat Dilimi Kapandı', `Seçtiğiniz ${selectedTimeSlot} saati az önce rezerve edildi. Lütfen başka bir saat seçiniz.`);
      goToStep(2);
      renderSlots();
      return;
    }

    // RULE C: Same phone number can only book ONE appointment per calendar day!
    const existingSameDay = appointments.find(
      a => a.date === chosenDateStr && normalizePhone(a.phone) === normPhone
    );
    if (existingSameDay) {
      const dateText = `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday}`;
      showAlert(
        'Günlük Randevu Sınırı',
        `Bu telefon numarası (${clientPhoneInput.value}) ile ${dateText} günü için zaten kayıtlı bir randevunuz (#${existingSameDay.id} - ${existingSameDay.time}) bulunmaktadır. Günde yalnızca 1 randevu oluşturulabilir.`
      );
      return;
    }

    // CREATE APPOINTMENT
    const refCode = 'RND-' + Math.floor(10000 + Math.random() * 90000);
    const newAppointment = {
      id: refCode,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      date: chosenDateStr,
      dateText: `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday}`,
      time: selectedTimeSlot,
      name: nameVal,
      phone: clientPhoneInput.value,
      notes: clientNotesInput ? clientNotesInput.value.trim() : '',
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveAppointments();
    lastConfirmed = newAppointment;

    // Refresh UI & show confirmation
    renderSlots();
    showConfirmationModal(newAppointment);

    // Reset Form
    bookingForm.reset();
    selectedTimeSlot = null;
    goToStep(1);
  }

  // --- CONFIRMATION MODAL & RECEIPT ---
  function showConfirmationModal(appt) {
    if (!confirmModal || !modalReceipt) return;

    modalReceipt.innerHTML = `
      <div class="receipt-line">
        <span class="r-label">Referans Kodu:</span>
        <span class="r-val r-code">${appt.id}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Berber:</span>
        <span class="r-val">${appt.barberName}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Tarih:</span>
        <span class="r-val">${appt.dateText}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Saat:</span>
        <span class="r-val">${appt.time}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Müşteri:</span>
        <span class="r-val">${appt.name}</span>
      </div>
      <div class="receipt-line">
        <span class="r-label">Telefon:</span>
        <span class="r-val">${appt.phone}</span>
      </div>
      ${appt.notes ? `
      <div class="receipt-line">
        <span class="r-label">Not:</span>
        <span class="r-val">${appt.notes}</span>
      </div>
      ` : ''}
    `;

    confirmModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideConfirmationModal() {
    if (confirmModal) {
      confirmModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // --- .ICS CALENDAR DOWNLOAD ---
  function downloadIcs() {
    if (!lastConfirmed) return;
    const a = lastConfirmed;
    const [year, month, day] = a.date.split('-');
    const [hour, min] = a.time.split(':');

    const startDate = new Date(year, month - 1, day, hour, min);
    const endDate = new Date(startDate.getTime() + 35 * 60 * 1000);

    const pad = n => String(n).padStart(2, '0');
    const formatIcs = d =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Emin Berber//Randevu//TR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${a.id}@emin-berber.com`,
      `DTSTAMP:${formatIcs(new Date())}Z`,
      `DTSTART:${formatIcs(startDate)}`,
      `DTEND:${formatIcs(endDate)}`,
      `SUMMARY:Emin Berber Randevusu - ${a.barberName}`,
      `DESCRIPTION:Emin Berber\\nMüşteri: ${a.name}\\nTel: ${a.phone}\\nİletişim: +90 552 669 95 97`,
      'LOCATION:Maslak Mah. Taşyoncası Sokak No: 8/A Sarıyer İstanbul',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Randevu_${a.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- ALERT BANNER ---
  function showAlert(title, message) {
    if (!flowAlert) return;
    flowAlertTitle.textContent = title;
    flowAlertMsg.textContent = message;
    flowAlert.classList.remove('hidden');
    flowAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (flowAlert) flowAlert.classList.add('hidden');
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Step 1 -> Step 2
    if (step1NextBtn) {
      step1NextBtn.addEventListener('click', () => {
        if (!selectedBarber) {
          showAlert('Seçim Yapınız', 'Lütfen devam etmek için bir berber seçiniz.');
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
        if (!selectedDateObj || !selectedTimeSlot) {
          showAlert('Seçim Yapınız', 'Lütfen uygun bir gün ve saat dilimi seçiniz.');
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

    // Direct step indicator click (if valid)
    stepIndicators.forEach((ind) => {
      ind.addEventListener('click', () => {
        const targetStep = parseInt(ind.getAttribute('data-step'), 10);
        if (targetStep === 1) {
          goToStep(1);
        } else if (targetStep === 2 && selectedBarber) {
          goToStep(2);
        } else if (targetStep === 3 && selectedBarber && selectedDateObj && selectedTimeSlot) {
          goToStep(3);
        }
      });
    });

    // Phone formatting
    if (clientPhoneInput) {
      clientPhoneInput.addEventListener('input', (e) => {
        e.target.value = formatPhoneDisplay(e.target.value);
        clientPhoneInput.classList.remove('has-error');
      });
    }

    if (clientNameInput) {
      clientNameInput.addEventListener('input', () => {
        clientNameInput.classList.remove('has-error');
      });
    }

    // Form submit
    if (bookingForm) {
      bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Alert close
    if (flowAlertClose) {
      flowAlertClose.addEventListener('click', hideAlert);
    }

    // Modal controls
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', hideConfirmationModal);
    }
    if (modalIcsBtn) {
      modalIcsBtn.addEventListener('click', downloadIcs);
    }
    if (confirmModal) {
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) hideConfirmationModal();
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
