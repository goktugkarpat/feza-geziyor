# Feza Geziyor ⚡🌍

4,5 yaşındaki Feza'nın Flash kıyafetiyle şimşek gibi koştuğu, Türkçe seslendirmeli üç boyutlu dünya gezisi. **3–5 yaş için, okuma bilmeden oynanabilir:** büyük resimler, tanınabilir simgeler ve doğal Türkçe sesler yol gösterir.
Feza uzaydan küçük bir mekikle bir ülkeye iner, ünlü yerleri keşfeder, koşarken küçük oyunlar oynar ve sahnedeki Dünya kapısından geçerek başka bir ülkeye gider.
Atmosfer neşeli ve sakindir: pastel renkler, mevsimlere göre kar, yağmur ya da kiraz çiçeği yaprakları ve sözsüz, marimba tınılı bir müzik vardır.

Oyunda **16 ülke, 48 keşif noktası, 12 çeşit koşu oyunu, 120 Türkçe ses kaydı** ve özgün bir müzik bulunur. Şiddet, kaybetme, puan ya da süre baskısı yoktur; çocuk yalnızca koşar ve her şey ona karşılık verir.

## Nasıl açılır

- **Bilgisayarda:** `index.html` dosyasına çift tıklamanız yeterli. Kurulum ya da internet gerekmez. Mac'te `OYNA.command` dosyasına çift tıklarsanız da oyun tarayıcıda açılır.
- **iPad'de / internette:** https://goktugkarpat.github.io/feza-geziyor/ adresini Safari ile açıp Paylaş › **Ana Ekrana Ekle** deyin. Oyun kendi simgesiyle, tam ekran bir uygulama gibi açılır. İlk açılıştan sonra **internet olmadan da** çalışır (`sw.js` bütün resimleri, sesleri ve müziği cihaza kaydeder).
- **Aynı Wi-Fi'daki iPad'de denemek için:** Mac'te `python3 serve.py` çalıştırıp yazdığı adresi iPad'de açın.
- **Sessiz açmak için:** adresin sonuna `?sessiz` ekleyin (ör. `index.html?sessiz`). Bu durumda anlatıcı ve müzik tamamen kapalı kalır, ses nesnesi bile oluşturulmaz.

## Nasıl oynanır

**Kontroller**

- **Dokunma:** Yere ya da bir yer resmine dokun, Feza oraya koşar. Parmağını sürüklersen Feza parmağının gittiği yöne doğru koşar; sürüklerken kendiliğinden hızlanır. Ek bir düğmeye basmak ya da zıplamak gerekmez.
- **Şimşek düğmesi:** Daha da hızlı koşmak isteyenler için sağ alttaki şimşek düğmesini basılı tutabilir. Oyun onsuz da tamamen oynanır.
- **Bilgisayarda:** Fare ile yere tıkla; yedek olarak ok tuşları ya da W A S D ile yürü, **boşluk** tuşuyla hızlan.
- **Harita:** Küreyi parmakla ya da fareyle sürükleyerek döndür; iki parmağını açarak (ya da artı/eksi düğmeleriyle) yakınlaştır.

**Akış**

1. Açılış ekranında büyük **BAŞLA!** düğmesine dokun. Feza uzayda el sallar; arkasında Dünya durur. Küreyi çevirip ülkelere bakabilirsin.
2. Bir **ülke resmine** ya da küredeki ülke işaretine **bir kez dokun**. Anlatıcı ülkenin adını söyler. İlk yolculukta Feza, açık penceresinden el sallayarak göründüğü küçük bir **uzay mekiğiyle** seçilen ülkeye iner.
3. Ülkede üstteki kartta üç **yerin resmi** durur. Birine dokununca Feza oraya koşar; ekranda bir hedef göstergesi (resim, yer adı ve uzaklık) yönü gösterir. İstersen kendin de gezebilirsin.
4. Bir ünlü yere yaklaşınca **keşif ve koşu oyunu kendiliğinden başlar.** Anlatıcı yerin kısa bilgisini söyler ve oyunu anlatır; Feza beş hedefin üstünden koşunca çiçekler açılır, uçurtmalar havalanır, toplar yuvarlanır. Oyun bitince küçük bir kutlama olur, yer albüme eklenir.
5. Başka ülkeye gitmek için sahnedeki parlayan **Dünya kapısının** içinden koş (ya da kapıya dokun, Feza oraya koşsun). Uzay haritası açılır ve yeni ülkeyi seçersin.
6. Ülkeler arasında Feza, kara ve deniz üzerinden gerçek konumlara göre çizilmiş bir **yolculuk sahnesinde** koşar: ağaçlar, tepeler, kum, kar ve dalgalar görünür. Yolculuk yaklaşık 8–16 saniye sürer; üstte ilerleme çubuğu ve kilometre gösterilir.

**Üst çubuktaki düğmeler**

| Düğme | Ne yapar |
|---|---|
| Kitap (yanında "0 / 48" sayacı) | Gezi albümünü açar |
| Küre | Dünya haritasını açar (ülke sahnesinden ayrılmadan da) |
| Hoparlör | O anda yapılacak şeyi anlatıcıya yeniden söyletir |
| Dişli | Ebeveyn ayarlarını açar |

Her açılışta gezi sıfırdan başlar: ziyaret edilen yerler, albüm ve koşu oyunları yalnız o oturumda tutulur. Yalnızca ebeveyn tercihleri (anlatıcı, müzik, görüntü) cihazda kalır.

## Uzay başlangıcı ve mekik inişi

- Başlangıç uzayda geçer: yıldızlar ışıldar, arada kuyruklu yıldızlar ve minik meteorlar kayar. Hareketi azaltma tercihi açık olan cihazlarda yıldızlar sabit kalır.
- İlk yolculukta Dünya görüntünün asıl öğesidir; küçük **uzay mekiği** kenardan girer, Feza açık penceresinden el sallar ve mekik seçilen ülkeye doğru süzülür. Pencerenin konumu mekikle birlikte döner, Dünya hiç örtülmez.
- İniş sırasında anlatıcı "Uzay mekiğimizle dünyaya iniyoruz" der; sonra ülke sahnesi hazırlanır ve ülkenin kendi karşılama cümlesi okunur.

## Dünya kapısı ve harita

- Her ülke sahnesinde, bir **Dünya kapısı** (içinde küre olan parlak bir işaret) bulunur. Kapıdan geçince **uzay haritası** açılır.
- Yeni bir ülkeye inildiğinde kapı kendiliğinden hemen açılmaz: ülkede en az bir yer keşfedilip kapıdan biraz uzaklaşıldıktan ve birkaç saniye geçtikten sonra etkinleşir; böylece Feza yanlışlıkla ülkeden çıkmaz. Kapıya bilerek dokunulursa bekleme kalkar ve Feza kapıya koşar.
- **Haritada** her ülke bir resim kartıyla gösterilir ve kartta o ülkede kaç yer keşfedildiği yıldızla (0–3) görünür. Haritaya döndüğünde büyük bir parmak ve ok ülke resimlerini işaret eder; bir ülke seçilince bu davet kapanır. Geziye geri dönmek için "Geziye dön" düğmesi (ayak izi) vardır.
- Küre, Natural Earth verisinden çizilmiş gerçek ülke sınırlarını gösterir; her ülkenin işareti kendi konumundadır.

## Ülkeler ve keşif noktaları

16 ülkenin her birinde 3 yer vardır (toplam 48). Her ülke sahnesi yaklaşık 124 × 124 birimlik geniş, stilize bir minyatür dünyadır; yerler birbirinden uzaktır ve koşarak gezilir. Sahneler gerçek şehirlerin ölçekli kopyası değil, ünlü yerlerin tanınır özelliklerinden esinlenen masalsı gezilerdir.

| Ülke | Yerler | Başlangıç koşu oyunu |
|---|---|---|
| 🇹🇷 Türkiye | Galata Kulesi · İstanbul Boğazı · Kapadokya | rüzgâr değirmenleri · su sıçramaları · uçurtma |
| 🇺🇸 Amerika Birleşik Devletleri | Özgürlük Heykeli · Brooklyn Köprüsü · Central Park | halkalar · uçurtma · çiçek yolu |
| 🇨🇦 Kanada | Niagara Şelaleleri · Toronto Kulesi · Buz Hokeyi Alanı | su sıçramaları · rüzgâr değirmenleri · toplar (hokey) |
| 🇧🇪 Belçika | Atomium · Büyük Meydan · Waffle Durağı | toplar · rüzgâr değirmenleri · kelebekler |
| 🇫🇷 Fransa | Eyfel Kulesi · Louvre Müzesi · Sen Nehri | rüzgâr değirmenleri · halkalar · su sıçramaları |
| 🇷🇺 Rusya | Aziz Vasil Katedrali · Kremlin Kuleleri · Kızıl Meydan | çiçek yolu · uçurtma · halkalar |
| 🇯🇵 Japonya | Fuji Dağı · Torii Kapısı · Kiraz Çiçeği Bahçesi | uçurtma · kelebekler · çiçek yolu |
| 🇨🇳 Çin | Çin Seddi · Gök Tapınağı · Bambu Bahçesi | rüzgâr değirmenleri · uçurtma · kelebekler |
| 🇪🇬 Mısır | Gize Piramitleri · Büyük Sfenks · Nil Kıyısı | rüzgâr değirmenleri · halkalar · su sıçramaları |
| 🇧🇷 Brezilya | Kurtarıcı İsa Heykeli · Şeker Tepesi · Copacabana Sahili | kelebekler · uçurtma · toplar |
| 🇬🇧 İngiltere | Big Ben · Tower Bridge · Stonehenge | rüzgâr değirmenleri · uçurtma · halkalar |
| 🇮🇹 İtalya | Kolezyum · Pisa Kulesi · Venedik Kanalları | halkalar · rüzgâr değirmenleri · su sıçramaları |
| 🇪🇸 İspanya | Sagrada Familia · Elhamra · Park Güell | uçurtma · su sıçramaları · kelebekler |
| 🇳🇱 Hollanda | Yel Değirmeni · Amsterdam Kanalları · Lale Bahçesi | rüzgâr değirmenleri · su sıçramaları · çiçek yolu |
| 🇦🇺 Avustralya | Sidney Opera Binası · Uluru · Mercan Kıyısı | uçurtma · halkalar · su sıçramaları |
| 🇮🇳 Hindistan | Tac Mahal · Rüzgâr Sarayı · Basamaklı Kuyu | çiçek yolu · rüzgâr değirmenleri · halkalar |

Bazı ayrıntılar: Central Park'ta gölet, kemerli köprü, teras ve çeşme, çim alanları, ağaç sıraları ve banklar, arkada şehir silueti vardır. Tarihî yapılarda pencere ve kemer ayrıntıları, yüzey kabartması ve farklı malzemeler görülür. Değirmen kanatları, tekneler, balıklar, bitkiler ve su hafifçe hareket eder (hareketi azaltma tercihi korunur).

Her ülkenin, o ülkeye gelince okunan bir karşılama cümlesi, haritada seçilince okunan kısa bir cümlesi ve her yerin kendi tanıtım cümlesi vardır (ülke başına 2, yer başına 1 kayıt).

## Keşif ve koşu oyunları

Bir yere yaklaşınca keşif kendiliğinden başlar; ayrıca bilgi kartı açılması beklenmez. Oyun **beş geniş hedeften** oluşur. Hedefler binaların arkasında ya da ulaşılamayan köşelerde doğmaz; yerin çevresinde Feza'nın rahatça koşabileceği bir yayın üstüne yerleştirilir. Hedef ekranın dışında ya da arayüzün altında kalırsa büyük resimli bir **ipucu düğmesi** yönü gösterir; ona dokununca Feza gerçek hedefe koşar. Hızlı geçişler de sayılır, her hedef bir kez kazanılır ve oyunun bitişi bir kez duyurulur. Bitiş yaklaşık dört saniye görünür; sonra Feza dilediği gibi koşmaya devam eder.

**Her yerde üç oyun sırayla değişir:** yerin kendi başlangıç oyunu ile beş "şenlik" oyunundan ikisi sırayla gelir. Aynı yere ya da aynı ülkeye yeniden gelince sıradaki oyun açılır. Sıra yalnızca o oturumda tutulur.

12 çeşit oyunun tamamı:

| Oyun | Ne olur |
|---|---|
| **Hız halkaları** | Sarı halkaların içinden koşunca halka parlayarak yükselir ve küçülüp kaybolur |
| **Renkli çiçek yolu** | Üstünden geçilen tomurcuklar açılır, yapraklar uzar |
| **Rüzgâr değirmenleri** | Değirmenin kanatları yavaş döner; Feza yaklaşınca fırıl fırıl döner |
| **Neşeli su sıçramaları** | Su birikintilerine basınca damlalar etrafa saçılır, halkalar yayılır |
| **Uçurtma uçurma** | Uçurtma ipinin ucunda yükselir, kuyruğundaki kurdeleler dalgalanır |
| **Toplarla koşu** | Top kaleye doğru yuvarlanır. Kanada'daki Buz Hokeyi Alanı'nda top yerine hokey diski kayar |
| **Kelebek bahçesi** | Kelebek kanatlarını hızla çırpıp yükselir |
| **Müzik bahçesi** | Renkli çanlar çalar ve dans eder; sonunda kısa bir bitiriş melodisi duyulur |
| **Oyuncak tren** | Vagonlar tek tek hazırlanır, tren raylarda hareket eder |
| **Renkli resim** | Her hedefte tuvale güneş, çiçek, gökkuşağı ya da ağaç gibi basit bir resim belirir |
| **Fener şenliği** | Fenerler yavaşça gökyüzüne yükselir |
| **Ayıcık pikniği** | Piknik örtüsü serilir, ayıcık el sallar ve yiyecekler belirir |

Her oyunun kendi sesli yönlendirmesi ve bitiş cümlesi vardır; hepsi okuma gerektirmez.

Müzik bahçesinde beş özgün çan notası (**do–re–mi–sol–la** aralığında) ve kısa bir bitiriş melodisi kullanılır. Bu çanlar müzik tercihine bağlıdır; müzik kapalıysa çanlar da susar. Anlatıcıdan bağımsızdır.

## Gezi albümü

Üstteki **kitap** düğmesi gezi albümünü açar. Albümde 16 ülkenin kartı bulunur; kartta ülkenin resmi, bayrağı, adı ve keşfedilen yer sayısına göre 0–3 yıldız görünür. Üç yerin üçü de keşfedilmişse kart "tamam" olarak işaretlenir. Bir karta dokununca anlatıcı ülkeyi söyler. Albümün özetinde kaç ülkeye gidildiği, kaç yer keşfedildiği ve kaç koşu oyunu tamamlandığı yazar. Albümde yalnızca kartlar kaydırılır; kapatma ve geziye dönme simgeleri her zaman görünür kalır. Üst çubuktaki sayaç (örn. "7 / 48") keşfedilen yer sayısını gösterir.

## Ebeveyn ayarları

Üstteki **dişli** düğmesi ebeveyn ayarlarını açar:

- **Türkçe anlatıcı:** Açık / Kapalı.
- **Neşeli müzik:** Açık / Kapalı. Anlatıcı ve müzik birbirinden bağımsız saklanır. Anlatıcı konuşurken müzik yumuşakça kısılır. Uygulama gizlenince (başka uygulamaya geçilince) müzik ve ses durur, dönünce yalnızca açık olanlar sürer. İlk dokunuşta açık olan kanallar başlar.
- **Görüntü:** **Otomatik**, **Akıcı** (gölgesiz, daha hafif) ya da **Ayrıntılı**. Otomatik, dokunmatik cihazlarda iPad'e uygun hafif profili seçer.
- **Kartpostal kaydet:** O anki sahneden, altında "FEZA GEZİYOR", ülke adı ve şehir yazan bir kartpostal resmi (`feza-<ülke>-kartpostal.png`) indirir. Yalnızca ülke sahnesindeyken çalışır.
- Ayarlar penceresinde ayrıca oyunun nasıl oynandığını anlatan kısa bir yardım yazısı bulunur.

Adresin sonuna `?sessiz` eklenirse anlatıcı ve müzik düğmeleri devre dışı kalır ve "Sessiz açılış" yazar.

## Mevsim ve hava

Her ülkenin sahnesi, masaldaki gibi seçilmiş bir mevsimde ve havada geçer. Bunlar gerçek ya da güncel hava durumu değildir.

| Ülke | Mevsim ve hava | Yağış |
|---|---|---|
| Türkiye, Hollanda, Hindistan | ılık ilkbahar | açık |
| Amerika | altın sonbahar | açık |
| Kanada, Rusya | kış, kar örtülü zemin, açılmış yollar | **kar taneleri** |
| Belçika, İngiltere | yağmurlu ilkbahar, ıslak zemin | **hafif yağmur** |
| Fransa, İtalya, İspanya | güneşli yaz | açık |
| Japonya | kiraz çiçeği baharı | **kiraz çiçeği yaprakları** |
| Çin | sisli bambu bahçesi, ilkbahar | **sis** |
| Mısır, Avustralya | sıcak, güneşli kumlar | açık |
| Brezilya | tropikal yağmur, canlı yeşil | **yağmur** |

Her mevsimin gökyüzü rengi, güneş ışığı, sisi, zemin dokusu (çimen, kar, kum), yol dokusu ve su rengi ayrıdır. Kar, yağmur ve yaprak taneleri küçük, sabit bir havuzla çizilir; yalnızca ülke gezisinde görünür. Hareketi azaltma tercihi açıksa taneler hiç çıkmaz.

## Sesler

- **Anlatıcı:** Microsoft Edge'in "tr-TR-EmelNeural" sesiyle (doğal, Türkçe bir kadın sesi) önceden kaydedilmiş **120 MP3**. Kayıtların başındaki ve sonundaki sessizlik ffmpeg ile kırpılmıştır; oyunda internet ya da tarayıcının kendi sesi kullanılmaz. Başlamış bir cümleyi menü, ülke ya da oyun değişikliği kesmez.
- **Kayıtların kapsamı:** açılış cümlesi, 16 ülke karşılama cümlesi, 16 ülke seçim cümlesi, 48 yer tanıtımı, yardım cümleleri (başlangıç, harita, gezi, hız, albüm, kartpostal, rota), kapı ve yolculuk cümleleri (uzay, kara, deniz, varış), keşif ve övgü cümleleri ile 12 koşu oyununun yönlendirme ve bitiş cümleleri.
- **Müzik:** "Feza Dünya Yolu", özgün, sözsüz, 76,8 saniyelik ve kesintisiz dönen bir parçadır (100 vuruş/dk). Marimba, glockenspiel, yumuşak pizzicato ve hafif tahta/perküsyon sesleri matematiksel olarak sentezlenir; hiçbir alıntı kayıt ya da melodi yoktur. Nota ve seviye bilgileri `assets/music/world-adventure.json` içinde durur.
- **Çanlar:** Müzik bahçesindeki 5 çan notası ve bitiriş sesi `tools/gen_chimes.py` ile üretilir (`assets/music/chime-1…5.wav`, `chime-finale.wav`).
- Övgü cümleleri kısa ve çeşitlidir, her doğru harekette tekrarlanmaz.

### Cümleleri değiştirmek

Cümleler `tools/gen_voice.py` içindedir. Bir cümleyi değiştirdikten sonra:

```bash
python3 -m pip install edge-tts imageio-ffmpeg
python3 tools/gen_voice.py            # yalnızca değişenleri üretir
python3 tools/gen_voice.py --hepsi    # hepsini baştan üretir
python3 tools/gen_voice.py --only intro,tr   # yalnızca seçilenleri
```

İnternet yalnızca kayıt üretirken gerekir. Yabancı sözcüklerin Türkçe okunuşu, betikteki okunuş listesi ile düzeltilir (ör. Tower Bridge → "Tavır Briç", Stonehenge → "Stonhenc", Thames → "Temz", Park Güell → "Park Güel"). Yeni bir cümlede kısa büyük harfli ya da ünlem gibi duran sözcük kullanmayın; ses motoru bunları kısaltma sanıp yanlış okuyabilir.

Müziği yeniden üretmek için `python3 tools/gen_music.py` (numpy ve ffmpeg gerekir); çanlar için `python3 tools/gen_chimes.py`.

## Dosyalar

| Dosya / klasör | Ne işe yarar |
|---|---|
| `index.html` | Oyunun girişi; ekranların ve düğmelerin yapısı |
| `src/` | Oyunun kodu: `app.js` (ana akış), `core.js` (3D sahne ve görüntü profili), `hero.js` (Feza), `countries.js` (ülkeler, yerler, mevsimler), `places.js` (yerlerin 3D modelleri), `activities.js` ve `activity-routes.js` (koşu oyunları ve hedef yerleşimi), `portal.js` (Dünya kapısı), `globe.js` ve `geography.js` (küre ve ülke sınırları), `space.js` (uzay), `shuttle.js` (mekik), `travel.js` (yolculuk sahnesi), `surfaces.js` (zemin dokuları), `weather.js` (kar, yağmur, yaprak), `audio.js` (ses ve müzik), `pictograms.js` (simgeler), `bootstrap.js`, `ui.css`, `playflow.css` |
| `assets/ui/` | 16 ülke ve 48 yer resmi (`country-xx.png`, `place-xx-yer.png`) |
| `assets/voice/` | 120 anlatıcı kaydı (MP3) ve `lines.json` |
| `assets/music/` | Müzik (`world-adventure.mp3`, notaları `world-adventure.json`) ve çan sesleri (`chime-*.wav`) |
| `vendor/` | 3D kütüphanesi (three.js, MIT lisansı) |
| `tools/gen_voice.py` | Anlatıcı seslerini üretir |
| `tools/gen_music.py` | Müziği üretir |
| `tools/gen_chimes.py` | Müzik bahçesinin çan seslerini üretir |
| `tools/gen-thumbnails.cjs` | Düğmelerdeki ülke ve yer resimlerini oyunun kendi 3D modellerinden çizer |
| `tools/update-cache.cjs` | İnternetsiz çalışma dosya listesini (`sw.js`) günceller |
| `manifest.webmanifest`, `sw.js`, `icon.svg`, `icons/` | iPad'de uygulama gibi açılma, simgeler ve internetsiz çalışma |
| `serve.py`, `OYNA.command` | Yerel sunucu (iPad'i aynı Wi-Fi'dan bağlamak için) ve Mac'te çift tıkla açma |
| `yayinla.command` | GitHub'a gönderme (ebeveyn isterse çalıştırır) |

## Kaynaklar ve lisanslar

- **Dünya küresi ve ülke sınırları:** [Natural Earth](https://www.naturalearthdata.com/) Admin-0 Countries 1:50m (v5.1.1) verisi; kamu malıdır (public domain). Kaynak ve doğrulama bilgisi `src/geography.js` dosyasının başında saklanır. Küre bir oyun haritasıdır, hukuki sınır belgesi değildir.
- **three.js:** MIT lisanslıdır; lisans bilgisi `vendor/three.js` içinde korunur.
- **Modeller:** Feza, mekik, ülke sahneleri, yolculuk manzaraları ve oyun nesneleri kodla yapılmış, stilize yorumlardır; dışarıdan model ya da doku kullanılmaz.
- **Müzik ve çanlar:** Tamamen özgündür, kodla sentezlenir.
- **Anlatıcı sesi:** Microsoft Edge'in çevrimiçi `tr-TR-EmelNeural` sesiyle üretilmiş kayıtlardır.
- **Yer bilgileri:** Her yerin kısa anlatımı yaygın ve genel bilgilerden yazılmıştır. Central Park ayrıntıları için [Bow Bridge](https://www.centralparknyc.org/locations/bow-bridge) ve [Bethesda Terrace](https://www.centralparknyc.org/locations/bethesda-terrace), Avustralya için [Tourism Australia](https://www.australia.com/en-us/places.html), Hindistan için [Incredible India](https://www.incredibleindia.gov.in/en/uttar-pradesh/agra) sayfalarından esinlenilmiştir. Sahneler gerçek yüksekliği, sokakları ya da uydu görüntüsünü göstermez.
