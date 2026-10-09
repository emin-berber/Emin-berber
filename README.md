# Emin Berber — 3 Adımlı Etkileşimli Randevu Sistemi

Modern, sade, hafif ve kullanıcı dostu yerel erkek kuaförü web sitesi ve **3 Adımlı Etkileşimli Randevu Akışı**.

---

## ✦ İşletme Bilgileri (Business Details)
- **İşletme Adı:** Emin Berber
- **İletişim & WhatsApp:** +90 552 669 95 97
- **Çalışma Saatleri:** Pazartesi — Cumartesi: 09:00 — 20:00 | Pazar: Kapalı
- **Adres:** Maslak Mah. Taşyoncası Sokak No: 8/A Sarıyer, İstanbul

---

## ✦ Dil ve Tasarım Prensipleri (Tone & Aesthetic)
- **Mütevazı ve Doğal Anlatım:** Abartılı pazarlama ifadeleri (*"en iyi"*, *"lüks"*, *"rakipsiz"*, *"kusursuz"*) kullanılmamıştır.
- **Sakin Renk Paleti:** Nötr gri, beyaz ve mat koyu antrasit tonlar.
- **Hızlı ve Mobil Odaklı:** Sıfır ağır kütüphane, temiz ve yüksek kontrastlı arayüz elemanları.

---

## ✦ Sayfa Mimarisi & Bileşenler

### 1. Üst Başlık (Header)
- Sol tarafta berber logosu ve **Emin Berber** ismi.
- Menü bağlantıları (*Ana Sayfa*, *Randevu*, *Ürünler*, *Konum & İletişim*).
- Sağ tarafta **"Randevu Al"** butonu (`target="_blank"` parametresiyle özel randevu sayfasını **YENİ SEKMEDE** açar).

### 2. Giriş Bölümü & Görsel Slider (Hero Section)
- **Sade Başlık:** *"Erkek Kuaförü & Saç Kesimi"*.
- Emin Berber için salon içi düzeni, saç kesimi ve sakal tıraşı fotoğraflarını gösteren temiz görsel kaydırıcı.

### 3. 3 Adımlı Etkileşimli Randevu Akışı (3-Step Booking Selector)
UI kullanıcıyı adım adım karmaşadan uzak şekilde yönlendirir:

- **1. ADIM: Berber Seçimi (Select Barber)**
  - Tıklanabilir usta kartları:
    - **Emin Usta** (Klasik Kesim & Sakal Tıraşı)
    - **Ahmet Usta** (Modern Kesim & Fade)
    - **Fark Etmez** (İlk Müsait Usta)
  - Seçilen usta vurgulanır ve onay işareti belirir.

- **2. ADIM: Tarih ve Saat Seçimi (Date & 30-Min Time Slots)**
  - Gün seçici şerit (*Bugün, Yarın, Cumartesi, Pazartesi...*).
  - **30 dakikalık zaman dilimleri** (10:00, 10:30, 11:00, 11:30 ... 19:30).
  - **Rezerve Edilmiş Slotlar:** Otomatik olarak üzeri çizili, soluk ve tıklanamaz (`disabled`) duruma geçer.

- **3. ADIM: İletişim Bilgileri & Onay (Contact & Confirmation)**
  - Seçilen berber, gün ve saatin özet kartı.
  - **Ad Soyad** (Zorunlu alan).
  - **Telefon Numarası** (**ZORUNLU ALAN** & Türkiye cep telefonu formatı `0 (5XX) XXX XX XX`).
  - **"Randevuyu Onayla"** butonu.
  - **Kural Kontrolü:** Aynı telefon numarası aynı gün için yalnızca 1 randevu oluşturabilir.
  - Onay sonrası referans kodlu makbuz ve takvime ekleme (.ics) seçeneği.

### 4. Bakım Ürünleri Vitrini (Products in TL)
Dükkanda kullanılan ve satışı olan saç & sakal ürünleri:
- **Şekillendirici Saç Vaksı (100 ml)** — 220 TL
- **Sakal Bakım Yağı (50 ml)** — 200 TL
- **Günlük Bakım Şampuanı (300 ml)** — 180 TL

### 5. Konum & İletişim (Location & Contact)
- **Çalışma Saatleri:** Pazartesi — Cumartesi: 09:00 — 20:00 | Pazar: Kapalı
- **Açık Adres:** Maslak Mah. Taşyoncası Sokak No: 8/A Sarıyer, İstanbul (Metroya 5 dk)
- **Doğrudan İletişim:** Telefon ile arama (+90 552 669 95 97) ve doğrudan WhatsApp bağlantısı.
- **Harita:** Sade harita kutusu ve Google Haritalar yönlendirme linki.

---

## ✦ Dosya Yapısı

```
├── index.html       # Ana berber web sitesi (Slider, 3 Adımlı Randevu, Ürünler, Konum)
├── randevu.html     # Yeni sekmede açılan tam ekran 3 Adımlı Randevu sayfası
├── barbershop.css   # Nötr minimalist tasarım stilleri & adım adım arayüz CSS'i
├── barbershop.js    # Slider ve mobil menü kontrolleri
├── booking-flow.js  # 3 adımlı randevu motoru, usta seçimi, 30 dk slotlar & kurallar
└── README.md        # Dokümantasyon
```
