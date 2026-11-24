<div align="center">

# 💬 Discord Chat Overlay

**Modern, lightweight, always-on-top Discord StreamKit chat & live online status overlay for Windows.**  
**Windows için modern, hafif, her zaman üstte kalan Discord StreamKit sohbet ve canlı çevrimiçi durum katmanı.**

![Version](https://img.shields.io/badge/version-2.0.0-5865F2?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows)
![Electron](https://img.shields.io/badge/Electron-45+-47848F?style=for-the-badge&logo=electron)

[🇹🇷 Türkçe Dokümantasyon](#-türkçe) • [🇬🇧 English Documentation](#-english)

</div>

---

## 🇹🇷 Türkçe

### 🎯 Ne İşe Yarar?
**Discord Chat Overlay**, oyun oynarken veya yayın yaparken Discord sunucundaki sohbet kanalını ve sunucudaki anlık çevrimiçi kişi sayısını **ekranının üstünde (always-on-top)** şeffaf ya da modern koyu cam kutu şeklinde görmeni sağlar. İkinci monitöre gerek kalmadan sohbeti takip edebilir, tek kısayolla katmanı kilitleyip oyuna tıklamaya devam edebilirsin.

### ✨ Öne Çıkan Özellikler
* **Modern Sekmeli Arayüz:** *Sohbet*, *Durum Banner* ve *Kısayollar* sekmeleriyle sade ve şık Discord temalı ayarlar penceresi.
* **Sohbet Gecikmesi (Chat Delay):** `0 – 60 saniye` arası ayarlanabilir gecikme (hazır butonlar: `Kapalı`, `3 sn`, `5 sn`, `10 sn`, `15 sn`). Yeni gelen mesajlar belirlediğin süre sonunda yumuşak animasyonla ekrana düşer.
* **Titremesiz Canlı Online Sayacı:** Discord StreamKit'in donup kalan online kişi sayısını arka planda sessizce günceller — banner **asla kapanıp açılmaz veya titremez**.
* **Tıklama Geçirme (Click-Through):** Katmanı kilitlediğinde fare tıklamaları doğrudan arkadaki oyuna/uygulamaya geçer.
* **Şeffaf veya Koyu Cam Tema:** İster sadece yazılar görünsün, ister modern yarı saydam koyu cam kutu içinde dursun.
* **Yazı Ölçeği & Konum Hafızası:** `%75 – %150` yazı ölçeği; pencere boyutu ve konumu `config.json` dosyasına otomatik kaydedilir.
* **Otomatik Güncelleyici:** Uygulama açıldığında GitHub'daki yeni sürümleri otomatik kontrol eder, kişisel ayarlarına (`config.json`) hiç dokunmadan kendini günceller.

### 🚀 Kurulum
1. Bu repoyu **Code → Download ZIP** ile indirip bir klasöre çıkar (veya `git clone` ile çek).
2. Bilgisayarında [Node.js](https://nodejs.org/) kurulu olduğundan emin ol.
3. Klasördeki **`KUR.bat`** dosyasına çift tıkla *(gerekli Electron paketlerini otomatik kurar)*.
4. Uygulamayı başlatmak için **`Baslat.vbs`** dosyasına çift tıkla.

### 🔗 StreamKit Linki Nasıl Alınır?
1. Bilgisayarında **Discord masaüstü uygulamasının** açık olduğundan emin ol.
2. Uygulamadaki **`↗ StreamKit`** butonuna tıkla (veya [streamkit.discord.com/overlay](https://streamkit.discord.com/overlay) adresine git).
3. **Install for OBS → Authorize** adımlarını onayla.
4. **Chat Widget** sekmesinden sunucunu ve kanalını seç, verilen `https://streamkit.discord.com/overlay/chat/...` linkini kopyalayıp uygulamanın **Sohbet** sekmesine yapıştır.
5. *(İsteğe bağlı)* **Status Widget** sekmesinden aldığın `https://streamkit.discord.com/overlay/status/...` linkini **Durum Banner** sekmesine yapıştır.
6. **Kaydet ve Katmanları Aç** butonuna bas.

### ⌨️ Kısayollar
| Kısayol | İşlev |
| :--- | :--- |
| `Ctrl` + `Shift` + `O` | Ayarlar penceresini aç |
| `Ctrl` + `Shift` + `L` | Katmanı kilitle / kilidi aç (tıklama geçir) |
| `Ctrl` + `Shift` + `H` | Katmanları gizle / göster |
| `Ctrl` + `Shift` + `Q` | Uygulamadan çık |

> **İpucu:** Katman kilitli değilken üst kenardaki ince tutamacı sürükleyerek taşıyabilir, kenarlardan boyutlandırabilir ve sağ tıklayarak hızlı menüyü açabilirsin.

---

## 🇬🇧 English

### 🎯 What Is It?
**Discord Chat Overlay** is a lightweight Windows desktop overlay built with Electron that keeps your Discord server's chat channel and live online member count **always on top** of your games or apps — no second monitor required. You can toggle click-through mode with a single shortcut so mouse clicks pass straight to your game.

### ✨ Key Features
* **Modern Tabbed Settings UI:** Clean Discord-inspired dark glassmorphic interface with *Chat*, *Status Banner*, and *Shortcuts* tabs.
* **Configurable Chat Delay:** Delay incoming chat messages by `0 – 60 seconds` (with quick presets: `Off`, `3s`, `5s`, `10s`, `15s`) with smooth fade & slide-in animations.
* **Flicker-Free Live Online Counter:** Automatically refreshes the server's online member count in the background (`5 – 60s` interval) without ever reloading or flashing the visible banner.
* **Click-Through Lock Mode:** Lock the overlay so all mouse clicks pass directly through to the game underneath.
* **Transparent or Dark Glass Style:** Choose between pure transparent text or a sleek translucent dark glass container.
* **Font Scaling & Persistent Bounds:** Scale text from `75%` to `150%`; window sizes and positions are automatically saved in `config.json`.
* **Built-in GitHub Auto-Updater:** Checks this repository on startup (or via the tray/context menu) and updates app files automatically without touching your personal `config.json`.

### 🚀 Installation
1. Download this repository via **Code → Download ZIP** and extract it (or run `git clone`).
2. Make sure [Node.js](https://nodejs.org/) is installed on your PC.
3. Double-click **`KUR.bat`** to install dependencies.
4. Double-click **`Baslat.vbs`** to launch the overlay cleanly in the background.

### 🔗 How to Get Your StreamKit URL
1. Make sure the **Discord desktop app** is running.
2. Click **`↗ StreamKit`** inside the settings window (or open [streamkit.discord.com/overlay](https://streamkit.discord.com/overlay)).
3. Click **Install for OBS → Authorize**.
4. Under **Chat Widget**, select your server and channel, then paste the `https://streamkit.discord.com/overlay/chat/...` URL into the **Chat** tab.
5. *(Optional)* Under **Status Widget**, copy the `https://streamkit.discord.com/overlay/status/...` URL and paste it into the **Status Banner** tab.
6. Click **Save & Open Overlays**.

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| `Ctrl` + `Shift` + `O` | Open Settings |
| `Ctrl` + `Shift` + `L` | Lock / Unlock (Click-Through) |
| `Ctrl` + `Shift` + `H` | Hide / Show Overlays |
| `Ctrl` + `Shift` + `Q` | Quit Application |

> **Tip:** When unlocked, hover near the top edge of any overlay to drag it, resize from the edges, or right-click anywhere on it for the quick menu.
