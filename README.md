# Feza Geziyor ⚡🌍

4,5 yaşındaki Feza'nın Flash kıyafetiyle şimşek gibi koştuğu, Türkçe seslendirmeli üç boyutlu dünya gezisi. **3–5 yaş için, okuma bilmeden oynanabilir:** büyük resimler, tanınabilir simgeler ve doğal Türkçe sesler yol gösterir.
Feza uzaydan bir mekikle bir ülkeye iner, ünlü yerleri keşfeder, koşarken küçük oyunlar oynar ve Dünya kapısından geçerek başka ülkeye gider.

Oyunda **16 ülke, 48 keşif noktası, 12 çeşit koşu oyunu, 120 Türkçe ses kaydı** ve neşeli sözsüz müzik var. Şiddet, kaybetme ya da süre baskısı yoktur.

## Nasıl açılır

- **Bilgisayarda:** `index.html` dosyasına çift tıklamanız yeterli. Kurulum ya da internet gerekmez. Mac'te `OYNA.command` da oyunu tarayıcıda açar.
- **iPad'de / internette:** https://goktugkarpat.github.io/feza-geziyor/ adresini Safari ile açıp Paylaş › **Ana Ekrana Ekle** deyin. Oyun kendi simgesiyle, tam ekran bir uygulama gibi açılır; ilk açılıştan sonra **internet olmadan da** çalışır (`sw.js` her şeyi cihaza kaydeder).

## Nasıl oynanır

1. Ekranın ortasındaki büyük **oyna üçgenine** dokun. Feza uzayda el sallar; yanında Dünya görünür. Küreyi sürükleyip çevirebilirsin.
2. Bir **ülke resmine** ya da küredeki ülke noktasına **bir kez dokun**. Anlatıcı ülkeyi söyler, Feza küçük bir uzay mekiğinin penceresinden el sallayarak ülkeye iner.
3. Gitmek istediğin **yerin resmine dokun**, Feza oraya koşar. İstersen parmağını sürükleyerek kendin de gezebilirsin (bilgisayarda fare ya da yön tuşları).
4. Ünlü bir yere yaklaşınca **keşif ve küçük koşu oyunu kendiliğinden başlar**. Çocuk yalnız koşar: çiçekler açılır, uçurtmalar havalanır, toplar yuvarlanır.
5. Başka ülkeye gitmek için sahnedeki **Dünya kapısının içinden koş**. Uzay haritası açılır, yeni ülkeyi seçersin.
6. Üstteki **kitap** gezi albümünü, **hoparlör** o anki açıklamayı tekrar söyler. Ebeveyn ayarlarında anlatıcı ve müzik ayrı ayrı kapatılabilir.

Adresin sonuna `?sessiz` eklersen oyun tamamen sessiz açılır (test için).

## Koşu oyunları

Hız halkaları · renkli çiçek yolu · rüzgâr değirmenleri · neşeli su sıçramaları · uçurtma uçurma · toplarla koşu (hokey dahil) · kelebek bahçesi

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `index.html` | Oyunun girişi |
| `src/` | Oyunun kodu |
| `assets/` | Resimler, sesler ve müzik |
| `vendor/` | 3D kütüphanesi (three.js, MIT lisansı) |
| `tools/gen_voice.py`, `tools/gen_music.py` | Sesleri ve müziği yeniden üretmek için |
| `manifest.webmanifest`, `sw.js`, `icons/` | iPad'de uygulama gibi açılma, simge ve internetsiz çalışma |
| `serve.py`, `OYNA.command` | İsteğe bağlı yerel sunucu (iPad'i aynı Wi-Fi'dan bağlamak için) |

## Sesler

Anlatıcı sesi Microsoft Edge'in çevrimiçi "tr-TR-EmelNeural" sesiyle önceden kaydedildi. Cümle değişirse:

```bash
python3 -m pip install edge-tts imageio-ffmpeg
python3 tools/gen_voice.py
```

## Kaynaklar

Modellerin tamamı kodla yapılmış stilize yorumlardır. Dünya küresi [Natural Earth](https://www.naturalearthdata.com/) Admin-0 Countries 1:50m (v5.1.1) verisini kullanır; veri kamu malıdır (public domain). Three.js MIT lisanslıdır; lisans bilgisi `vendor/three.js` içinde korunur.

## Genişletilmiş dünya

İngiltere, İtalya, İspanya, Hollanda, Avustralya ve Hindistan eklendi. Ülke sahnelerinin zemini 72 × 72 yerine 124 × 124 birimdir; yaklaşık üç kat yüzölçümü vardır. Yerler geniş çevreleriyle gezilir. Central Park gölet, kemerli köprü, teras ve çeşme, çim alanları, ağaç sıraları, banklar ve şehir silueti içerir. Tarihî yapılarda pencere ve kemer detayları, yüzey kabartması ve farklı malzemeler bulunur. Değirmen kanatları, tekneler, balıklar, bitkiler ve su hafifçe hareket eder; azaltılmış hareket tercihi korunur.

Sahneler gerçek yerlerin tanınabilir özelliklerinden esinlenen stilize gezilerdir; gerçek ölçekli şehir veya coğrafya kopyası değildir. Central Park ayrıntıları: [Bow Bridge](https://www.centralparknyc.org/locations/bow-bridge), [Bethesda Terrace](https://www.centralparknyc.org/locations/bethesda-terrace). Yeni destinasyon kaynakları: [Tourism Australia](https://www.australia.com/en-us/places.html), [Incredible India](https://www.incredibleindia.gov.in/en/uttar-pradesh/agra).

- Her yer üç farklı etkinlik arasında sırayla değişir; aynı yere yeniden gelişte ve ülkeye dönüşte sıradaki oyun açılır. Sıra yalnız oturumda tutulur. Yeni oyunlarda çanlar dans eder, vagonlar hazırlanır, resimler belirir, fenerler yükselir ve ayıcık piknikleri kurulur. Bitiriş dört saniye görünür; koşmak serbesttir.

Mini oyunlarda beş özgün çan notası ve kısa bitiriş melodisi kullanılır (`tools/gen_chimes.py`). Müzik tercihi kapalıysa çanlar da susar; anlatıcıdan bağımsızdır.
