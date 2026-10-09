/**
 * REZERV. — Ultra-Minimalist High-Converting Single-Page Appointment Booking
 * Core Logic: Strict phone verification, single daily appointment rule,
 * instant time-slot auto-closure & zero-latency client state.
 */

(function () {
  'use strict';

  // --- CONFIGURATION & SLOTS DEFINITION ---
  const WEEKDAY_SLOTS = [
    '09:00', '09:45', '10:30', '11:15',
    '13:00', '13:45', '14:30', '15:15',
    '16:00', '16:45', '17:30'
  ];

  const SATURDAY_SLOTS = [
    '10:00', '10:45', '11:30', '12:15',
    '13:30', '14:15'
  ];

  const STORAGE_KEY_APPOINTMENTS = 'rezerv_appointments_v1';

  // Days of week and months in Turkish
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
  let availableDates = [];
  let selectedDateObj = null; // { dateString: 'YYYY-MM-DD', label: '...', weekday: '...' }
  let selectedTimeSlot = null;
  let appointments = [];

  // DOM Elements
  const heroCtaBtn = document.getElementById('hero-cta-btn');
  const dateStrip = document.getElementById('date-strip');
  const slotsContainer = document.getElementById('slots-container');
  const selectedTimeInput = document.getElementById('selected-time-input');
  const availableSlotsCountEl = document.getElementById('available-slots-count');
  const summaryDateTimeText = document.getElementById('summary-date-time-text');
  const appointmentForm = document.getElementById('appointment-form');
  const clientNameInput = document.getElementById('client-name');
  const clientPhoneInput = document.getElementById('client-phone');
  const clientNotesInput = document.getElementById('client-notes');
  const nameErrorEl = document.getElementById('name-error');
  const phoneErrorEl = document.getElementById('phone-error');
  const alertBanner = document.getElementById('booking-alert-banner');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const alertCloseBtn = document.getElementById('alert-close-btn');

  // Modal elements
  const successModal = document.getElementById('success-modal');
  const modalReceiptBox = document.getElementById('modal-receipt-box');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDownloadIcs = document.getElementById('modal-download-ics');

  // Lookup section
  const lookupForm = document.getElementById('lookup-form');
  const lookupPhoneInput = document.getElementById('lookup-phone');
  const lookupResultBox = document.getElementById('lookup-result-box');
  const resetDemoBtn = document.getElementById('reset-demo-btn');

  let lastConfirmedAppointment = null;

  // --- INITIALIZATION ---
  function init() {
    loadAppointments();
    seedInitialDemoSlotsIfEmpty();
    generateDateList(14);
    renderDateStrip();
    selectDate(availableDates[0]);
    setupEventListeners();
  }

  // --- STORAGE & SEEDING ---
  function loadAppointments() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      appointments = data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Storage read error:', e);
      appointments = [];
    }
  }

  function saveAppointments() {
    try {
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(appointments));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  function seedInitialDemoSlotsIfEmpty() {
    // Seed 2 mock appointments for today/tomorrow so the user immediately sees auto-closure in action
    if (!appointments || appointments.length === 0) {
      const today = new Date();
      const todayStr = formatDateIso(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = formatDateIso(tomorrow);

      appointments = [
        {
          id: 'RND-DEMO1',
          date: todayStr,
          time: '10:30',
          name: 'Selin Aktaş (Demo)',
          phone: '05321112233',
          notes: 'Ön görüşme',
          createdAt: new Date().toISOString()
        },
        {
          id: 'RND-DEMO2',
          date: todayStr,
          time: '14:30',
          name: 'Murat Kaya (Demo)',
          phone: '05442223344',
          notes: 'Danışmanlık',
          createdAt: new Date().toISOString()
        },
        {
          id: 'RND-DEMO3',
          date: tomorrowStr,
          time: '11:15',
          name: 'Zeynep Demir (Demo)',
          phone: '05553334455',
          notes: 'Takip görüşmesi',
          createdAt: new Date().toISOString()
        }
      ];
      saveAppointments();
    }
  }

  // --- DATE UTILITIES ---
  function formatDateIso(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateDateList(numDays) {
    availableDates = [];
    const today = new Date();

    for (let i = 0; i < numDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      // Skip Sunday (Business is closed on Sundays as stated in footer)
      if (d.getDay() === 0) {
        continue;
      }

      const iso = formatDateIso(d);
      const dayNum = d.getDate();
      const weekday = TURKISH_DAYS_SHORT[d.getDay()];
      const monthShort = TURKISH_MONTHS_SHORT[d.getMonth()];
      const monthFull = TURKISH_MONTHS_FULL[d.getMonth()];
      const isToday = (i === 0);

      availableDates.push({
        dateString: iso,
        dayNum: dayNum,
        weekday: weekday,
        monthShort: monthShort,
        monthFull: monthFull,
        year: d.getFullYear(),
        isToday: isToday,
        rawDate: d
      });
    }
  }

  // --- RENDERING DATES ---
  function renderDateStrip() {
    dateStrip.innerHTML = '';
    availableDates.forEach((dateItem) => {
      const pill = document.createElement('div');
      pill.className = 'date-pill';
      pill.setAttribute('role', 'radio');
      pill.setAttribute('aria-checked', 'false');
      pill.setAttribute('data-date', dateItem.dateString);

      pill.innerHTML = `
        <span class="pill-weekday">${dateItem.weekday}</span>
        <span class="pill-day">${dateItem.dayNum}</span>
        <span class="pill-month">${dateItem.monthShort}</span>
        ${dateItem.isToday ? '<span class="pill-today-tag">Bugün</span>' : ''}
      `;

      pill.addEventListener('click', () => {
        selectDate(dateItem);
      });

      dateStrip.appendChild(pill);
    });
  }

  function selectDate(dateItem) {
    selectedDateObj = dateItem;
    selectedTimeSlot = null;
    selectedTimeInput.value = '';

    // Update Pill Active state
    const allPills = dateStrip.querySelectorAll('.date-pill');
    allPills.forEach((p) => {
      const isCurrent = p.getAttribute('data-date') === dateItem.dateString;
      p.classList.toggle('selected', isCurrent);
      p.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    });

    // Render Slots for this date
    renderTimeSlots();
    updateSummaryText();
    hideAlert();
  }

  // --- RENDERING TIME SLOTS WITH AUTO-CLOSURE ---
  function renderTimeSlots() {
    slotsContainer.innerHTML = '';
    if (!selectedDateObj) return;

    // Determine booked slots on this specific date
    const bookedForDate = appointments.filter(a => a.date === selectedDateObj.dateString);
    const bookedTimeSet = new Set(bookedForDate.map(a => a.time));

    // Determine slots depending on day
    const isSaturday = (selectedDateObj.rawDate && selectedDateObj.rawDate.getDay() === 6);
    const activeSlotList = isSaturday ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
    
    const slotSubtitleEl = document.getElementById('slot-subtitle');
    if (slotSubtitleEl) {
      slotSubtitleEl.textContent = isSaturday 
        ? 'Cumartesi çalışma saatleri (10:00 - 15:00) listelenmektedir' 
        : 'Hafta içi müsait saatler listelenmektedir';
    }

    activeSlotList.forEach((slotTime) => {
      const isBooked = bookedTimeSet.has(slotTime);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.setAttribute('data-time', slotTime);

      if (isBooked) {
        // STRICT RULE A: Time-slot auto-closure
        btn.classList.add('booked');
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.title = 'Bu saat dilimi daha önce rezerve edilmiştir.';
        btn.innerHTML = `
          <span class="slot-time">${slotTime}</span>
          <span class="slot-status-text">Dolu</span>
        `;
      } else {
        availableCount++;
        const isSelected = (selectedTimeSlot === slotTime);
        if (isSelected) {
          btn.classList.add('selected');
        }

        btn.innerHTML = `
          <span class="slot-time">${slotTime}</span>
          <span class="slot-status-text">${isSelected ? 'Seçildi' : 'Müsait'}</span>
        `;

        btn.addEventListener('click', () => {
          selectTimeSlot(slotTime);
        });
      }

      slotsContainer.appendChild(btn);
    });

    // Update live counter badge
    availableSlotsCountEl.textContent = `${availableCount}`;
  }

  function selectTimeSlot(slotTime) {
    selectedTimeSlot = slotTime;
    selectedTimeInput.value = slotTime;

    // Update classes
    const allSlotBtns = slotsContainer.querySelectorAll('.slot-btn:not(.booked)');
    allSlotBtns.forEach((btn) => {
      const isCurrent = btn.getAttribute('data-time') === slotTime;
      btn.classList.toggle('selected', isCurrent);
      const statusText = btn.querySelector('.slot-status-text');
      if (statusText) {
        statusText.textContent = isCurrent ? 'Seçildi' : 'Müsait';
      }
    });

    updateSummaryText();
    hideAlert();
  }

  function updateSummaryText() {
    if (selectedDateObj && selectedTimeSlot) {
      summaryDateTimeText.textContent = `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday}, Saat: ${selectedTimeSlot}`;
    } else if (selectedDateObj) {
      summaryDateTimeText.textContent = `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday} (Saat seçiniz)`;
    } else {
      summaryDateTimeText.textContent = 'Henüz tarih ve saat seçilmedi';
    }
  }

  // --- PHONE FORMATTING & SANITIZATION ---
  function normalizePhone(val) {
    if (!val) return '';
    // Strip all non-digits
    let digits = val.replace(/\D/g, '');
    // If starts with 90, strip country code for unified 10/11 digit comparison
    if (digits.startsWith('90') && digits.length >= 12) {
      digits = digits.substring(2);
    }
    // Normalize leading 0
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    return digits; // Returns 10 digits e.g. 5XXXXXXXXX
  }

  function formatPhoneDisplay(value) {
    // Keeps mask: 0 (5XX) XXX XX XX
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('90')) digits = digits.substring(2);

    // Limit to max 11 digits (with leading 0)
    if (digits.length > 11) digits = digits.substring(0, 11);

    if (digits.length === 0) return '';

    if (!digits.startsWith('0')) {
      digits = '0' + digits;
    }

    let formatted = '0 ';
    if (digits.length > 1) {
      formatted += '(' + digits.substring(1, Math.min(4, digits.length));
    }
    if (digits.length >= 4) {
      formatted += ') ';
    }
    if (digits.length > 4) {
      formatted += digits.substring(4, Math.min(7, digits.length));
    }
    if (digits.length >= 7) {
      formatted += ' ';
    }
    if (digits.length > 7) {
      formatted += digits.substring(7, Math.min(9, digits.length));
    }
    if (digits.length >= 9) {
      formatted += ' ';
    }
    if (digits.length > 9) {
      formatted += digits.substring(9, Math.min(11, digits.length));
    }

    return formatted;
  }

  function validateTurkishPhone(phoneStr) {
    const norm = normalizePhone(phoneStr);
    // Must be 10 digits and start with 5 (standard Turkish mobile format: 5XXXXXXXXX)
    return norm.length === 10 && norm.startsWith('5');
  }

  // --- STRICT BOOKING VALIDATION & SUBMISSION ---
  function handleBookingSubmit(e) {
    e.preventDefault();
    hideAlert();

    let hasError = false;

    // Check Date & Slot
    if (!selectedDateObj || !selectedTimeSlot) {
      showAlert('Eksik Seçim', 'Lütfen randevu için bir tarih ve uygun bir saat dilimi seçin.');
      document.getElementById('booking-widget').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Name Validation
    const nameVal = clientNameInput.value.trim();
    if (!nameVal || nameVal.length < 2) {
      clientNameInput.parentElement.classList.add('error');
      clientNameInput.classList.add('has-error');
      hasError = true;
    } else {
      clientNameInput.parentElement.classList.remove('error');
      clientNameInput.classList.remove('has-error');
    }

    // STRICT RULE B: Phone number input is STRICTLY REQUIRED
    const rawPhone = clientPhoneInput.value;
    const isValidPhone = validateTurkishPhone(rawPhone);
    if (!isValidPhone) {
      clientPhoneInput.closest('.input-group').classList.add('error');
      clientPhoneInput.classList.add('has-error');
      hasError = true;
    } else {
      clientPhoneInput.closest('.input-group').classList.remove('error');
      clientPhoneInput.classList.remove('has-error');
    }

    if (hasError) return;

    const normPhone = normalizePhone(rawPhone);
    const chosenDate = selectedDateObj.dateString;

    // STRICT RULE A CHECK: Is this slot already booked in real time?
    const slotAlreadyTaken = appointments.some(
      a => a.date === chosenDate && a.time === selectedTimeSlot
    );

    if (slotAlreadyTaken) {
      showAlert(
        'Saat Dilimi Kapandı',
        `Üzgünüz, ${selectedTimeSlot} saat dilimi az önce başka bir kullanıcı tarafından rezerve edildi. Lütfen başka bir saat seçin.`
      );
      renderTimeSlots(); // Immediately disable the slot visually
      return;
    }

    // STRICT RULE C: Restrict bookings so that the SAME phone number can only book ONE appointment per calendar day!
    const existingBookingSameDay = appointments.find(
      a => a.date === chosenDate && normalizePhone(a.phone) === normPhone
    );

    if (existingBookingSameDay) {
      // Rejection of duplicate single-day booking!
      const formattedDateText = `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday}`;
      showAlert(
        'Günlük Randevu Sınırı Kuralı',
        `Bu telefon numarası (<strong>${clientPhoneInput.value}</strong>) ile <strong>${formattedDateText}</strong> günü için zaten kayıtlı bir randevunuz (<strong>#${existingBookingSameDay.id} — Saat ${existingBookingSameDay.time}</strong>) bulunmaktadır. Sistemimiz gereği aynı telefon numarası bir günde en fazla 1 randevu alabilir.`,
        true,
        clientPhoneInput.value
      );
      return;
    }

    // CREATE APPOINTMENT
    const referenceCode = 'RND-' + Math.floor(10000 + Math.random() * 90000);
    const newAppointment = {
      id: referenceCode,
      date: chosenDate,
      dateLabel: `${selectedDateObj.dayNum} ${selectedDateObj.monthFull} ${selectedDateObj.weekday}`,
      time: selectedTimeSlot,
      name: nameVal,
      phone: clientPhoneInput.value,
      normPhone: normPhone,
      notes: clientNotesInput.value.trim(),
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveAppointments();
    lastConfirmedAppointment = newAppointment;

    // Immediately trigger auto-closure for this slot
    renderTimeSlots();

    // Show Confirmation Modal
    showSuccessConfirmation(newAppointment);

    // Reset Form
    appointmentForm.reset();
    selectedTimeSlot = null;
    selectedTimeInput.value = '';
    updateSummaryText();
  }

  // --- CONFIRMATION MODAL & RECEIPT ---
  function showSuccessConfirmation(appt) {
    modalReceiptBox.innerHTML = `
      <div class="receipt-row">
        <span class="receipt-label">Referans Kodu:</span>
        <span class="receipt-code">${appt.id}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Tarih:</span>
        <span class="receipt-val">${appt.dateLabel}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Saat Dilimi:</span>
        <span class="receipt-val">${appt.time}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Danışan:</span>
        <span class="receipt-val">${appt.name}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Telefon:</span>
        <span class="receipt-val">${appt.phone}</span>
      </div>
      ${appt.notes ? `
      <div class="receipt-row">
        <span class="receipt-label">Randevu Notu:</span>
        <span class="receipt-val">${appt.notes}</span>
      </div>
      ` : ''}
    `;

    successModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideSuccessConfirmation() {
    successModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // --- ICALENDAR (.ics) EXPORT ---
  function generateIcsFile() {
    if (!lastConfirmedAppointment) return;

    const appt = lastConfirmedAppointment;
    const [year, month, day] = appt.date.split('-');
    const [startHour, startMin] = appt.time.split(':');

    // Create 45 minute duration
    const startDate = new Date(year, month - 1, day, startHour, startMin);
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const formatIcsDate = (d) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const dtStart = formatIcsDate(startDate);
    const dtEnd = formatIcsDate(endDate);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//REZERV//Randevu Sistemi//TR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${appt.id}@rezerv-randevu.com`,
      `DTSTAMP:${formatIcsDate(new Date())}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Randevu - ${appt.name} (${appt.id})`,
      `DESCRIPTION:REZERV Randevusu\\nTelefon: ${appt.phone}\\nNot: ${appt.notes || 'Yok'}`,
      'LOCATION:Maslak Mah. Büyükdere Cad. No: 122/4 Sarıyer İstanbul',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Randevu_${appt.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- ALERT BANNER ---
  function showAlert(title, message, showLookupAction = false, phoneVal = '') {
    alertTitle.textContent = title;
    alertMessage.innerHTML = message;
    if (showLookupAction && phoneVal) {
      alertMessage.innerHTML += `
        <div style="margin-top: 0.75rem;">
          <button type="button" id="alert-action-btn" class="btn btn-secondary" style="font-size: 0.8125rem; padding: 0.4rem 0.9rem; border-radius: 9999px;">
            Mevcut Randevumu Yönet / İptal Et &rarr;
          </button>
        </div>
      `;
      setTimeout(() => {
        const actionBtn = document.getElementById('alert-action-btn');
        if (actionBtn) {
          actionBtn.addEventListener('click', () => {
            lookupPhoneInput.value = phoneVal;
            const lookupSection = document.querySelector('.lookup-section');
            if (lookupSection) {
              lookupSection.scrollIntoView({ behavior: 'smooth' });
            }
            lookupForm.dispatchEvent(new Event('submit'));
          });
        }
      }, 50);
    }
    alertBanner.classList.remove('hidden');
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    alertBanner.classList.add('hidden');
  }

  // --- APPOINTMENT LOOKUP & CANCELLATION ---
  function handleLookup(e) {
    e.preventDefault();
    const query = normalizePhone(lookupPhoneInput.value);

    if (!query || query.length < 10) {
      lookupResultBox.innerHTML = `
        <p style="color: var(--accent-danger); font-size: 0.875rem;">
          Lütfen sorgulamak için geçerli bir cep telefonu numarası giriniz.
        </p>
      `;
      lookupResultBox.classList.remove('hidden');
      return;
    }

    const matched = appointments.filter(a => normalizePhone(a.phone) === query);

    if (matched.length === 0) {
      lookupResultBox.innerHTML = `
        <p style="color: var(--text-muted); font-size: 0.875rem;">
          Bu telefon numarasına ait kayıtlı bir randevu bulunamadı.
        </p>
      `;
    } else {
      let html = `<h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem;">Bulunan Randevular (${matched.length})</h4>`;
      matched.forEach(appt => {
        html += `
          <div class="active-booking-item">
            <div>
              <strong>${appt.date} — Saat ${appt.time}</strong>
              <div style="font-size: 0.8125rem; color: var(--text-muted);">
                Ref: #${appt.id} | ${appt.name}
              </div>
            </div>
            <button class="btn-cancel-appt" data-id="${appt.id}">Randevuyu İptal Et</button>
          </div>
        `;
      });
      lookupResultBox.innerHTML = html;

      // Add cancellation handlers
      const cancelBtns = lookupResultBox.querySelectorAll('.btn-cancel-appt');
      cancelBtns.forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const idToCancel = ev.target.getAttribute('data-id');
          cancelAppointment(idToCancel);
        });
      });
    }

    lookupResultBox.classList.remove('hidden');
  }

  function cancelAppointment(id) {
    if (!confirm('Bu randevuyu iptal etmek istediğinize emin misiniz? Seçili saat yeniden müsait hale gelecektir.')) {
      return;
    }

    appointments = appointments.filter(a => a.id !== id);
    saveAppointments();
    renderTimeSlots();
    lookupForm.dispatchEvent(new Event('submit'));
    showAlert('Randevu İptal Edildi', `#${id} numaralı randevu iptal edildi. Slot tekrar müsait duruma getirildi.`);
  }

  function resetDemoData() {
    if (confirm('Tüm randevuları temizleyip başlangıç demo verilerine dönmek istiyor musunuz?')) {
      localStorage.removeItem(STORAGE_KEY_APPOINTMENTS);
      appointments = [];
      seedInitialDemoSlotsIfEmpty();
      renderTimeSlots();
      lookupResultBox.classList.add('hidden');
      lookupPhoneInput.value = '';
      showAlert('Sıfırlandı', 'Demo verileri başarıyla sıfırlandı.');
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Smooth scroll from hero CTA
    if (heroCtaBtn) {
      heroCtaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('booking-widget');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Name input live reset
    clientNameInput.addEventListener('input', () => {
      clientNameInput.parentElement.classList.remove('error');
      clientNameInput.classList.remove('has-error');
    });

    // Phone Auto-formatting on input
    clientPhoneInput.addEventListener('input', (e) => {
      const cursorPosition = e.target.selectionStart;
      const originalLength = e.target.value.length;
      const formatted = formatPhoneDisplay(e.target.value);
      e.target.value = formatted;

      // Reset error indicator when user types
      clientPhoneInput.closest('.input-group').classList.remove('error');
      clientPhoneInput.classList.remove('has-error');
    });

    lookupPhoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhoneDisplay(e.target.value);
    });

    // Form submit
    appointmentForm.addEventListener('submit', handleBookingSubmit);

    // Modal controls
    modalCloseBtn.addEventListener('click', hideSuccessConfirmation);
    modalDownloadIcs.addEventListener('click', generateIcsFile);
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) hideSuccessConfirmation();
    });

    // Alert close
    alertCloseBtn.addEventListener('click', hideAlert);

    // Lookup & Reset
    lookupForm.addEventListener('submit', handleLookup);
    resetDemoBtn.addEventListener('click', resetDemoData);
  }

  // Run init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
