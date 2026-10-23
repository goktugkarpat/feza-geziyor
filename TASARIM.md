# Feza Geziyor — "Canlı dünya turu" tasarım sözleşmesi

Bu belge yeni tasarımın **sözleşmesidir**. Ülke ajanları, GRAFIK ajanı ve MIMAR aynı kurallara uyar.
`../CLAUDE.md` ve `AGENTS.md` kuralları hâlâ geçerlidir; bu belgeyle çelişen AGENTS.md maddeleri
aşağıdaki "AGENTS.md'de değişenler" bölümüne göre güncellenmiştir. Kod adları İngilizce/Türkçe karışık olabilir;
yeni API adları Türkçedir.

## 1. Oyun akışı

1. **Uzay** (karşılama): el sallayan Feza + yanında Bilbo, BAŞLA düğmesi.
2. **Ülke seçimi** (Dünya küresi + resimli ülke listesi; değişmedi).
3. **İniş**: ilk ülkeye uzay mekiğiyle, sonrakilere koşu yolculuğuyla (değişmedi).
4. **Rehber karşılama** (yalnız kayıtlı ülkelerde): ülkenin hayvan dostu (Türkiye: Van kedisi Pamuk) koşarak gelir,
   el sallar, kendini tanıtır (`rehber.sesler.merhaba`). Feza el sallar, Bilbo sevinir. Karşılama ~4 sn; dokununca kısalır.
5. **Gezi**: Rehber `rota` sırasındaki sıradaki hedefe (yer / taşıt durağı / Dünya kapısı) yürür, Feza'yı bekler,
   başının üstünde hedefin **resimli balonu** görünür. Balona ya da rehbere dokunmak Feza'yı oraya koşturur.
   Bilbo arada sıradaki hedefi koklayıp havlar (ipucu).
6. **Yerler**: Feza bir yere yaklaşınca o yere özgü **mini oyun** kendiliğinden başlar (kamera oyuna döner,
   Feza oyunun yanında durur). Kaybetme, süre, puan cezası yok. Oyundan çıkış: büyük "ayak + ok" düğmesi.
7. **Taşıt**: Durağa dokun ya da durağa koş → Feza, Bilbo ve rehber taşıta zıplayarak biner, kısa keyifli yolculuk
   (sinematik kamera, otomatik; çocuk kontrol etmek zorunda değil), öbür durakta inerler.
8. **Pasaport**: Her mini oyun bitince o yerin **çıkartması** uçarak pasaport düğmesine gider. Ülkenin üç yeri bitince
   ülke **damgası** basılır. Pasaport kitabı sayfaları çevrilen bir defterdir (bkz. §7).
9. **Dünya kapısı**: Rehber son olarak kapıyı gösterir ve vedalaşır. Kapıdan geçince uzay haritası (değişmedi).

**Yeni sistem yalnız kaydı tam olan ülkede açılır** (`FLASH_ULKE.var(id)`: rehber + en az bir oyun). Kaydı olmayan ülke
eski sistemle (12 genel koşu oyunu, `FLASH_ACTIVITIES`) oynar. Kayıtlı bir ülkede oyunu olmayan yer eski koşu
oyununa düşer. Böylece ülkeler tek tek, kırmadan taşınır.

**Oturum kuralı (değişmedi):** Her açılışta gezi sıfırdan başlar. Pasaport (çıkartma/damga), ziyaretler, taşıt ve
oyun durumu yalnız bellekte tutulur; `localStorage`'a yalnız ses/müzik/görüntü tercihi yazılır.

## 2. Dosya yapısı ve yükleme sırası (index.html)

```
vendor/three.js
src/core.js            (GRAFIK: render/ışık/gölge kısmı)   src/grafik*.js (GRAFIK)
src/feza.js            Feza modeli  (FLASH_FEZA)
src/bilbo.js           Bilbo modeli + takip (FLASH_BILBO)
src/countries.js  src/surfaces.js(GRAFIK)  src/weather.js(GRAFIK)  src/space.js(GRAFIK)
src/geography.js  src/places.js  src/globe.js  src/pictograms.js  src/travel.js  src/shuttle.js
src/audio.js  src/ses-listesi.js (üretilir)  src/perf-hud.js
src/activity-routes.js  src/activity-fx.js  src/activities.js      (eski 12 oyun = yedek)
src/ulke-kayit.js      FLASH_ULKE (kayıt)
src/rehber-kit.js      FLASH_REHBER_KIT (hayvan yapım kiti)
src/rehber.js          FLASH_REHBER (rehber davranış motoru)
src/tasit.js           FLASH_TASIT (taşıt motoru)
src/mini-oyun.js       FLASH_MINI (mini oyun motoru + yardımcılar)
src/pasaport.js        FLASH_PASAPORT (pasaport kitabı)
src/tur.js             FLASH_TUR (kayıtlı ülkede akışı yöneten oturum)
src/ulke/<id>-rehber.js  src/ulke/<id>.js   (her ülke; sıra: ülke dosyaları en sonda, app.js'ten önce)
src/portal.js  src/app.js
```
Ülke dosyaları yalnız `FLASH_ULKE.kaydet` çağırır; yükleme anında THREE nesnesi yaratmaz (her şey `yap/kur/dekor`
fonksiyonlarının içinde, ülke seçilince yükleme perdesi altında oluşur).

## 3. Ülke içerik kaydı API'si

```js
FLASH_ULKE.kaydet('tr', {
  rehber: {
    ad: 'Pamuk', tur: 'Van kedisi',
    yap(kit) { return model; },          // kit = FLASH_REHBER_KIT; model sözleşmesi §4
    sesler: {                            // ses kimlikleri (sesler/<id>.txt içinde metinleri olmalı)
      merhaba: 'tr-rehber-merhaba',      // karşılama (zorunlu)
      gel: ['rehber-gel-1','rehber-gel-2'], // Feza uzakta kalınca (ortak satırlar kullanılabilir)
      dokun: ['tr-rehber-dokun-1', ...], // rehbere dokununca (sırayla)
      kapi: 'tr-rehber-kapi'             // her şey bitince veda + kapı
    }
  },
  rota: ['galata', 'vapur', 'bosphorus', 'balon', 'cappadocia', 'kapi'],  // yer id / taşıt id / 'kapi'
  tasitlar: [ TASIT, ... ],              // §5
  oyunlar: { galata: OYUN, bosphorus: OYUN, cappadocia: OYUN },          // §6, anahtar = countries.js yer id
  dekor(ctx) { return { root, guncelle(dt, time), dispose(), engeller: [{x,z,r}] }; },  // isteğe bağlı ek süs (dünya koordinatı)
  yerler: {                              // isteğe bağlı: places.js'teki eski landmark modelinin YERİNE ülkenin kendi modeli
    galata: { yap(ctx) { return { root, guncelle(dt, time), dispose(), engeller: [{x,z,r}] }; } }  // ctx.kok yer merkezinde; engeller YEREL
  },
  eskiCevre: false,                      // isteğe bağlı: places.js çevre dolgu binaları + yol ağaçları kurulmaz (GRAFIK serpiştirmesi de kapanır, §13.4); ülke kendi dolu sahnesini dekor()'da kurar
  bosAlanlar: [{x,z,r}],                 // GRAFIK'in ağaç serpiştirmesi ve places.js çevre binaları burayı boş bırakır
  sesler: { gelis: 'tr-gelis' }          // isteğe bağlı: ülkeye varış cümlesi (yoksa eski '<id>' sesi)
});
```
- Bir ülke birden çok dosyaya bölünebilir (`<id>-rehber.js`, `<id>.js`, büyük sahneler için `<id>-sahne.js`); `kaydet` parçaları
  birleştirir (`oyunlar/sesler/yerler` nesne olarak, `tasitlar` dizi olarak).
- **Radikal sahne:** ülke ajanı landmark'ları `yerler.<id>.yap` ile baştan, yüksek kaliteyle kurar (eski kutu modeller yerine);
  çevreyi `eskiCevre:false` + `dekor()` ile kendisi doldurur (sokaklar, evler, ağaçlar, insanlar/hayvanlar, su). Yerin merkezi ve
  yarıçapı countries.js'tedir; oyunun Feza noktası, rehber noktası ve taşıt durakları bu modelin içinde boş kalmalı.
  Çarpışma: `engeller` daireleri (yerler'de yerel, dekor'da dünya koordinatı) yol planlamaya otomatik eklenir.
- Yeni sistem yalnız `FLASH_ULKE.var(id)` doğruyken (rehber + en az bir oyun) devreye girer; `yerler`/`eskiCevre` de ancak o zaman uygulanır.
- Koordinatlar dünya birimidir: harita 124×124, hareket sınırı ±60, ada kıyısı ±62, deniz yüzeyi y=-1.5.
  Yer konumları countries.js'te (her ülkede aynı: `[-35,-25]`, `[34,-27]`, `[24,27]`, yarıçap ≈ 9–15);
  iniş noktası (0, 25), Dünya kapısı ≈ (-0.75, 19). Kapı çevresine (r=4) ve iniş noktasına bir şey koyma.
- `ctx` (dekor/taşıt/oyun kurulumlarında ortak, `FLASH_TUR` verir):
  `{ THREE, ulke, dunya (Group), yer(id)→{x,z,radius,...}, zemin(x,z)→y, carpisma(x,z,pay)→bool,
     ses(id), efekt(ad), cing(i, final), azHareket (prefers-reduced-motion), kit: FLASH_MINI.yardim }`

## 4. Rehber (hayvan dostu)

### 4.1 Model sözleşmesi (`rehber.yap(kit)` döndürür)
```js
model = { root, boy, guncelle(dt, time, durum), dispose() }
// root: +Z'ye bakar, ayak y=0, tur sahnesinde root.scale=1 doğru boy (1.7–2.3; Feza ≈ 2.53, Bilbo ≈ 1.76)
// durum = { mod, hiz, bak }
//   mod: 'bekle'|'yuru'|'kos'|'selam'|'dans'|'sevin'|'konus'|'otur'|'isaret'  (bilinmeyen → bekle)
//   hiz: m/sn (adım temposu)   bak: THREE.Vector3|null (dünya noktası; baş döner, gövdeyi motor çevirir)
// 'otur': root taşıt tabanında, kalça boy*0.35'te.  dispose(): yalnız kendi geometri/iskeleti.
```
### 4.2 Kit (`src/rehber-kit.js`, FLASH_REHBER_KIT) — yeni hayvan böyle yapılır
Hızlı yol `K.hayvan(ayar)`:
```js
FLASH_ULKE.kaydet('cn', { rehber: { ad:'Bambu', tur:'panda', yap: K => K.hayvan({
  ad:'Bambu', tip:'iki', boy:2.0,                 // tip: 'iki' (dik çizgi film) | 'dort' (dört ayaklı yavru)
  renk:{ kurk:0xffffff, karin, ic:0x222222, burun, pati, yanak, kenar, agiz, dil },
  bas:{ r:[x,y,z] }, govde:{ en, dolgun },
  goz:{ yaw, pitch, en, boy, iris:[sol, sag], bebek:'yuvarlak'|'dikey' },
  kulak:{ tip:'sivri'|'yuvarlak'|'uzun'|'sarkik'|'yok', boy, en, aci },
  kuyruk:{ tip:'ince'|'kabarik'|'kalin'|'kisa'|'yok', boy, kalin, kivrik },
  agizlik:{ tip:'kedi'|'burun'|'duz', uzun, en }, biyik, biyikRenk,
  boya(parca, renk, p, uv, ham) { /* desen: parca adına göre renk.set(...) */ },
  ekle(y, k, o) { /* özel parça: y.elips(k.bas, renk, [x,y,z], [sx,sy,sz]) ... */ }
}) } });
```
- `boya` parça adları: `bas govde kulakL/R kulakIcL/R kuyruk kuyrukUc kuyrukKok kolL/R dirsekL/R elL/R bacakL/R dizL/R ayakL/R agizlik cene boyun`.
- `ekle(y,k,o)`: `k` kemikler (`kalca govde bas kolL/R dirsekL/R elL/R bacakL/R dizL/R ayakL/R kuyruk[3] kulakL/R agiz gozler`),
  `o = {basMerkez, basR, onZ, dort}`. 'dort' tipinde kol = ön bacak.
- Yapıcı (tamamen özel hayvan): `y = K.yapici(ad)`, `y.kemik(ust,ad,x,y,z)`, `y.parca(kemik, geo, renk, {p,s,r|q,mat:'kurk'|'parlak'|'isik',boya,harman,sahip})`,
  `y.elips / y.kucuk / y.mini / y.yogun / y.kubbe / y.boru(kemik, noktalar, r|(t)=>r, renk) / y.goz(basKemik, merkez, r3, {...})`,
  `y.bitir(hedefBoy)` → malzeme başına tek SkinnedMesh. `K.surucu(root, kok, k, {tip, olcu})` standart animasyon sürücüsü.
- Geometri: `K.loft, K.dikLoft, K.kapsul, K.boruGeo, K.kulakGeo, K.yuzeyNoktasi`; paylaşılan `K.malzeme.kurk/parlak/isik`, `K.geo.*`
  (**paylaşılanları dispose etme**). Yardımcılar `K.yardim.{clamp,clamp01,sstep,damp}`, `K.renk`, `K.karistir`, `K.MODLAR`.
- Kalite: Pamuk (`src/ulke/tr-rehber.js`) örnektir — büyük parlak gözler, yanak allığı, yumuşak kürk, ülkeye ait küçük
  aksesuar (fular, şapka…). Kartondan kesilmiş/köşeli görünüm yok.

### 4.3 Rehber motoru (FLASH_REHBER, `src/rehber.js` — MIMAR)
Motor modeli konumlar/çevirir ve `durum.mod` seçer: karşılama → rota hedefine öncülük (Feza 14 birimden uzaksa durup el
sallar ve `gel` der) → hedefte `isaret` → oyunda yanında durup ilerlemede `sevin`, bitişte `dans` → taşıtta `otur`.
Rehbere dokunmak `dokun` seslerinden birini söyletir ve küçük bir sevinç yaptırır. Başının üstündeki resimli balon
(sıradaki hedefin resmi) DOM düğmesidir; dokununca Feza hedefe koşar.

## 5. Taşıtlar (FLASH_TASIT, `src/tasit.js` — MIMAR)

```js
TASIT = {
  id: 'vapur', ikon: 'vapur',                 // FLASH_PICTO adı (ülke dosyası FLASH_PICTO.ekle('vapur', '<path…/>') ile ekleyebilir)
  duraklar: [ {yer:'galata', x, z, yon}, {yer:'bosphorus', x, z, yon} ],  // biniş noktaları (dünya koordinatı; Feza buraya koşar)
  // her durakta isteğe bağlı yuru:[x,z,y]: Feza önce yürüyerek bu uca gider (iskele ucu; ±59 sınırının dışı olabilir), sonra zıplar; inişte tersi
  yap(ctx) { return {
    root,                                     // durak 0'da park eder; +Z ileri
    oturak: { feza:[x,y,z], bilbo:[x,y,z], rehber:[x,y,z] },  // root yerelinde oturma yüzeyi
    guncelle(dt, time, hal),                  // hal = {ilerleme 0..1, hareket: bool, hiz}
    dispose() } },
  yol(a, b) { return [[x,y,z], ...]; },       // durak a'dan b'ye dünya noktaları (Catmull-Rom ile yumuşatılır); y = taşıt kökünün yüksekliği
  sure: 10,                                   // saniye
  kamera: { uzak: 20, yukari: 9, yan: 0.6 },  // takip kamerası (isteğe bağlı)
  sesler: { davet:'tr-vapur-davet', yol:'tr-vapur-yol', var:'tr-vapur-var' },
  efekt: { kalkis:'vapur-duduk' }             // assets/sfx/<ad>.mp3
}
```
- Biniş: Feza durağın 3 birim yakınına gelince (ya da durak simgesine/taşıta dokununca koşup varınca) karakterler
  0.6 sn'lik zıplamayla oturaklara geçer, `feza.setSeated(true)`, `bilbo.bin(...)`, rehber `otur`.
- Yolculuk otomatiktir; giriş kilitlidir; kamera taşıtı yandan-arkadan izler. Varınca iniş zıplaması, taşıt varılan
  durakta kalır (geri dönüş mümkün). İnişten sonra aynı durakta tekrar binmek için Feza 6 birim uzaklaşmalı.
- Yol kara üstünden geçecekse havadan (balon, teleferik) ya da `bosAlanlar` ile boşaltılmış şeritten geçmeli.

## 6. Mini oyunlar (FLASH_MINI, `src/mini-oyun.js` — MIMAR)

```js
OYUN = {
  id: 'simit', ikon: 'simit', ad: 'Martılara simit',
  toplam: 5,                                  // ilerleme resmi sayısı (alttaki ikon dizisi)
  sesler: { basla:'tr-simit-basla', bitti:'tr-simit-bitti', ipucu:'tr-simit-ipucu' },
  feza: [dx, dz],                             // Feza'nın durduğu yer (yer merkezine göre)
  rehber: [dx, dz], bilbo: [dx, dz],          // oyun boyunca rehberin durduğu ve Bilbo'nun oturup izlediği yer
  kamera: { bak:[dx,dy,dz], uzak: 15, yukari: 8, yon: 0 },  // yer merkezine göre; yon=kamera yatay açısı (rad)
  kur(o) { return {
    guncelle(dt, time),
    dokun(t) → bool,                           // t = {x, y, isin: Raycaster, zemin: Vector3|null}
    surukle?(t) → bool,                        // t.faz: 'basla'|'devam'|'bit', t.dx/dy piksel
    ilerleme() → 0..toplam, bitti() → bool,
    dispose() } }
}
```
`o` = ortak ctx (§3) + `{ kok (yer merkezinde Group), yerBilgi, feza (Feza API: throwAt, handWorld, cheer, wave, express),
bilbo (sevin, havla, bak), rehber ({sevin(), dans(), konus(id)}), ilerle() (bir adım: çan + ikon + ara sıra övgü),
ekran(v3)→{x,y,gorunur}, enYakin(liste, konumFn, t, px=80) }`.
Kurallar: dokunma hedefleri büyük (≥ 80 px ekran yarıçapı kabul), yanlış dokunuşta ceza yok, oyun kendiliğinden ilerleyen
canlılıkla dolu. 3–6 adım, 30–90 sn. Bitişte motor: `sesler.bitti`, kutlama, çıkartma, rehber dansı. Oyun nesneleri
`dispose`'a kadar yaşar; aynı yere dönüşte oyun yeniden kurulur (tekrar oynanabilir, çıkartma bir kez).

## 7. Pasaport (FLASH_PASAPORT, `src/pasaport.js` — MIMAR)
- Kitap: kapak (Feza + Bilbo), sonra ülke başına bir çift sayfa: solda ülke damgası alanı + rehber portresi,
  sağda üç çıkartma yuvası (yer resmi, beyaz kenarlı, hafif eğik). Sayfa çevirme: kaydırma ya da büyük ok.
- `yerKazan(ulkeId, yerId)` çıkartma kazandırır (uçma animasyonu), üç çıkartmada `damga` otomatik basılır.
- Ülke ajanları pasaporta dokunmaz; resimler `assets/ui/place-<ulke>-<yer>.png`'den gelir.

## 8. Feza ve Bilbo API'si
**Feza** (`src/feza.js`, `FLASH_FEZA.create()`): `root` (+Z, boy 1.78 × ölçek; turda ölçek 1.42), `update(dt, hız01, boost, time)`,
`bones` (eski hero.js kemik adları), `celebrate(s)`, `land()`, `lookAt(v|null)`, `wave(s)`, `cheer(s)`, `throwAt(v)`→bırakmaya kalan sn,
`handWorld(out,'R'|'L')`, `express('mutlu'|'saskin'|'gulme', s)`, `setSeated(on)`, `seatHeight`, `height`, `dispose()`.
**Bilbo** (`src/bilbo.js`, `FLASH_BILBO.create({free, ses, reduced})`): `root` (turda boy ≈ 1.76), `guncelle(dt,time,{x,z,yon,hiz})`,
`isinla(x,z,yon)`, `kokla({x,z}, sn)`, `havla()`, `sevin(sn)`, `otur(on)`, `bin(parent, localPos, yon)`, `in(x,z,yon)`,
`bak(v|null)`, `mod()`, `konum()`, `dispose()`. Mini oyunlar Bilbo'yu yalnız bu API ile oynatır.

## 9. Seslendirme
- Metinler **`sesler/<ulke>.txt`** (ülke ajanı yalnız kendi dosyasını yazar) ve `sesler/ortak.txt` (MIMAR):
  her satır `kimlik | metin` ya da `kimlik | metin | rehber`. `rehber` sesi aynı Emel sesidir, biraz daha tiz ve hızlı
  (hayvan dostun sesi). `#` ile başlayan satır yorumdur.
- Kimlik biçimi: `<ulke>-<konu>[-n]` (ör. `tr-simit-basla`), küçük harf/rakam/tire.
- Kayıt: `python3 tools/gen_voice.py --only tr-simit-basla,...` (ya da `--yeni`: eksik/değişmiş hepsi). Araç
  `assets/voice/<kimlik>.mp3` + `src/ses-listesi.js` üretir; oyun yalnız listede olan kimliği çalar.
- Metin kuralları: kısa (≤ 2 cümle, ≤ 7 sn), doğal Türkçe; kısaltmaya benzeyen sözcük/ünlem yok ("Aa", "Oo" yok;
  "Bak bak", "Vay" kullan); İngilizce/yabancı adlar okunduğu gibi yazılır (Big Ben → "Big Ben", Sydney → "Sidney").
  Övgü motorun işidir (ara sıra, çeşitli: `ovgu-1..6`); oyun bitiş cümlesine "Aferin" koyma.
- Efektler (`assets/sfx/*.mp3`, kısa, kırpılmış): `FLASH_AUDIO.efekt(ad)`. Yeni efekt ekleyen ajan kaynağını/lisansını
  `assets/sfx/KAYNAKLAR.md`'ye yazar; kodla üretilenler `tools/gen_sfx.py` içindedir.
- `?sessiz` açılışında hiçbir Audio/AudioContext oluşmaz (değişmedi).

## 10. Performans bütçesi — ZORUNLU KURAL (ebeveyn: "performans hep iyi olmalı, M1 iPad ile")
Hedef: M1 iPad Pro'da (dokunmatik profil: DPR 1, gölge 512) **kararlı 60 FPS**. Bütçeyi aşan iş teslim edilmez.
| Kalem | Sınır (gölge geçişi dahil) |
|---|---|
| Tur sahnesi toplam | **≤ 150 çizim çağrısı, ≤ 400k üçgen** (`renderer.info.render`, gölge haritası dahil) |
| Feza + Bilbo + rehber birlikte | ≤ 15 çizim çağrısı (Feza 4, Bilbo 4, rehber ≤ 5) |
| Ülke içeriği (yerler + dekor/çevre + taşıtlar + o an açık oyun + rehber) | ≤ 70 çizim çağrısı, ≤ 200k üçgen |
| Ülke landmark'ları (`yerler`, üçü birlikte) | ≤ 18 çizim (malzeme türü başına birleştir), ≤ 90k üçgen |
| Çevre (`dekor` + `eskiCevre:false` ile kurulan şehir/doğa) | ≤ 15 çizim (InstancedMesh: ağaç, ev, lamba…), ≤ 60k üçgen |
| Rehber | ≤ 5 çizim (kit: malzeme başına tek SkinnedMesh), ≤ 20k üçgen |
| Taşıt | ≤ 5 çizim, ≤ 15k üçgen |
| Bir mini oyunun etkin hâli | ≤ 12 çizim, ≤ 30k üçgen |
| (zemin/gökyüzü/su/hava — GRAFIK) | ≈ 35–45 çizim; ülke içeriği eklenince toplam ≤ 150 kalmalı |
| Ülke dokuları | ≤ 4 MB GPU; canvas doku ≤ 512² |
Kurallar:
- **Paylaş:** aynı görünüş = aynı geometri + malzeme. Çok renkli statik parça → `FLASH_MINI.yardim.model()` ile TEK mesh
  (vertex color). Tekrarlanan hareketli nesne (martılar, yunuslar, balonlar, damlalar) → `InstancedMesh`.
  Malzemeleri `ctx.havuz.malzeme(...)` ile al (aynı tür tek derleme). Yeni shader türü sayısını küçük tut.
- **Her karede yaratma yok:** `new`, dizi/nesne literali, `geometry.dispose()/new BufferGeometry`, `clone()` kare
  döngüsünde yasak. Geçici Vector3/Matrix4'ler modül başında bir kez. Tampon güncellemesi yalnız değişen InstancedMesh
  matrisleri ya da küçük (≤ 2k köşe) dinamik geometri (çömlek gibi) için ve yalnız değiştiği karede.
- **Önceden derleme:** bütün ülke nesneleri (dekor, taşıtlar, rehber VE üç oyunun görsel parçaları) yükleme perdesi
  altında sahnede bulunur ve `renderer.compileAsync` ile derlenir: motor her yerin oyununu ülke hazırlanırken bir kez
  `kur()` eder ve gizli bekletir (ilk başlatma bu örneği kullanır; tekrar oynamada yeniden `kur()` edilir — aynı malzeme
  türleri olduğundan yeni derleme olmaz). Bu yüzden `kur()` yalnız nesneleri kurar; zamanlayıcı/ses başlatmaz, mantık
  ilk `guncelle`'de başlar. Malzemeyi her `kur()`'da yeniden yaratma: `o.havuz.malzeme(...)` kullan. İlk dokunuşta takılma = hata.
- Gölge: küçük/çok sayıda nesnede `castShadow=false` (parçacık, damla, uzak süs). Gölge döken toplam ≤ 40 çizim.
- Ölçüm (her ülke teslimi için zorunlu): `?sessiz&ulke=<id>` ile her yerde ve taşıtta `FLASH_TEST.durum()`
  (`cagri`, `ucgen`) + CDP `Emulation.setCPUThrottlingRate {rate:4}` altında 10 sn kare süresi (ortalama ve en kötü %5).
  Raporda bu sayılar olmalı. Masaüstü benzetim fiziksel iPad ölçümü diye sunulmaz.

## 11. Dosya sahipliği
| Sahip | Dosyalar |
|---|---|
| MIMAR | `src/app.js, feza.js, bilbo.js, rehber.js, rehber-kit.js, tasit.js, mini-oyun.js, pasaport.js, tur.js, ulke-kayit.js, places.js, countries.js, portal.js, shuttle.js, travel.js, globe.js, activities*.js, pictograms.js, audio.js, ui.css, playflow.css, index.html, sesler/ortak.txt, tools/*, TASARIM.md, src/ulke/tr*.js, sesler/tr.txt` |
| GRAFIK | `src/core.js` (render/ışık/gölge), `src/surfaces.js, weather.js, space.js, src/grafik*.js` |
| ÜLKE ajanı `<id>` | `src/ulke/<id>.js`, `src/ulke/<id>-rehber.js`, `sesler/<id>.txt`, `assets/voice/<id>-*.mp3`, `assets/sfx/<id>-*.mp3`, kendi `assets/ui/` resimleri |
- Ortak dosyada değişiklik gerekiyorsa (index.html'e script eklemek dahil) kendin yapma: raporuna **"MIMAR'dan istek"**
  diye yaz. Tek istisna: index.html'de `<!-- ULKE DOSYALARI -->` işaretinin hemen altına kendi iki `<script>` satırını
  ekleyebilirsin (başka satıra dokunma). `sw.js`'i en son MIMAR günceller (`python3 tools/update-cache.py`).
- Git: kimse commit/push yapmaz; ebeveyn "yükle" deyince MIMAR yapar.

## 12. Test kuralları
- Daima `index.html?sessiz` + `--mute-audio`; kendi HTTP portun (ör. 8820+ ajan no) ve CDP portun; test betikleri ve
  ekran görüntüleri scratchpad'e, oyun klasörüne asla.
- Hızlı test bağlantıları: `?sessiz&ulke=tr` (doğrudan ülkeye iner), `&yer=galata` (o yerin oyununu başlatır),
  `&tasit=vapur` (taşıta bindirir). `window.FLASH_TEST` (yalnız `?sessiz` iken) durum okumak içindir:
  `FLASH_TEST.durum()` → `{mod, ulke, feza, tur:{faz, siradaki, oyun, tasit, biten, binilen, rehber}, pasaport, bilbo, cagri, ucgen}`,
  `FLASH_TEST.dokunEkran(x,y)` (oyunda dokunuş), `FLASH_TEST.surukle(x0,y0,x1,y1,n)`, `FLASH_TEST.ekran(x,y,z)` (dünya→ekran),
  `FLASH_TEST.isinla(x,z)`, `FLASH_TEST.yol(x,z,r)` (yol planı), `FLASH_TEST.carp(x,z,pay)`, `FLASH_TEST.sec(id)` (ülkeye in),
  `FLASH_TEST.tur().oyunBaslat(yer)`, `FLASH_TEST.tur().tasitaBin(id)`, `FLASH_TEST.pasaport.cevir(1)`.
  Kendi `yerler`'ini sahneden önce denemek: `?sessiz` aç → `FLASH_ULKE.kaydet(id,{...})` → `FLASH_TEST.sec(id)`.
- Kontrol listesi: konsol hatası yok; iPad yatay 1180×820 ve dikey 820×1180 ekran görüntüsü; oyunun her adımı
  dokunarak bitiyor; çıkış düğmesi çalışıyor; taşıt iki yönde çalışıyor; ülke değişip geri gelince sızıntı yok
  (`renderer.info.memory` sabit); `?sessiz`'de ses nesnesi sıfır.

## 13. GRAFIK'ten istekler
1. `surfaces.js` serpiştirme `open()` işlevi `country.bosAlanlar` (`[{x,z,r}]`) dairelerine ağaç/kaya/çalı koymasın.
   (`FLASH_TUR` kayıtlı ülkede `country.bosAlanlar`'ı ülke kaydından doldurur.)
2. Paylaşılabilir su malzemesi: `FLASH_GRAFIK.su({renk, sig})` → MeshStandardMaterial (dalga + köpük; dünya koordinatlı),
   ülke dekorlarındaki küçük göl/kanal/havuzlar için. Yoksa ülke dosyaları basit animasyonlu malzeme kullanır.
3. Mini oyun yakın plan kamerasında (uzaklık 9–16) gölge kutusu Feza'nın değil `C.shadowsAt(x,z)` ile verilen noktanın
   etrafında kalsın (zaten böyle; değiştirirken bozma).

4. `country.eskiCevre === false` ise (app.js bunu ülke kaydından doldurur) surfaces.js serpiştirmesi (ağaç/çalı/kaya/
   çiçek/yol taşı) kurulmasın ya da yalnız çimen tutamları kalsın; ülke kendi çevresini kurar.

## 14. AGENTS.md'de değişenler
- "Karakter kaynağı ../feza-huysuzlara-karsi" → **kaynak `../feza-bilbo/hala/src/04_feza.js` ve `04_bilbo*.js`** (bağımsız kopya).
- "On iki tür … beş geniş hedefle oynanır" → kayıtlı ülkelerde **yere özgü mini oyun** (§6); 12 tür yalnız yedek.
- "Her yer üç farklı etkinlik arasında sırayla değişir" → yalnız eski sistemde.
- "Gezi albümü" → **pasaport kitabı** (§7). Oturum içi kuralı aynen geçerli.
- "Otomatik bilgi kartı gösterme" aynen geçerli; rehberin resimli balonu bilgi kartı değil, dokunulabilir yön işaretidir.
- Ülkeler arası koşu ve uzay mekiği aynen kalır; ülke içinde taşıtlar eklenir.

## 15. GRAFIK → MIMAR: index.html'e şu scriptler (sıra)
1. `<script src="src/grafik.js"></script>` — **`src/core.js`'ten hemen sonra**, diğer bütün sahne dosyalarından
   (feza.js, bilbo.js, countries.js, surfaces.js, places.js …) önce. (Yoksa oyun çalışır ama oyuncak gölgelendirme,
   stilize su, ortak gökyüzü/bulut, ufuk silüeti ve yaprak düzeltmesi kapanır.) `sw.js` için `update-cache` yeter (src/*.js taranıyor).
2. **travel.js isteği (doğrulandı):** yamayı uygula →
   `scratchpad/gz/grafik/istek/travel.patch` (35 satır). Ne yapar: (a) gökyüzünde havada asılı gri/bej "koniler"
   aslında `birdMesh = pool('white', flat, 9)` kuşlarıydı → koyu, çift yüzlü V kanatlı kuş geometrisi + kanat çırpma;
   (b) `material(key)` içinde bir kez: `sea` → `FLASH_GRAFIK.surface(m,'water',{edge:'none'})`, `leaf/leaf2/pine` →
   `FLASH_GRAFIK.surface(m,'leaf')`. Yolculuğun gökyüzü kubbesi + bulutları zaten ortak gökyüzünden otomatik gelir.
3. places.js'te iki küçük GRAFIK değişikliği: Fuji ve bir dağ yerindeki uçan-daire gibi düz gri bulut diskleri 4 yuvarlak
   loblu kabarık buluta çevrildi (`/* GRAFIK: yumuşak kabarık bulut */`); ve tek satır eklendi, `material()` içinde `mat.forceSinglePass` satırından önce:
   `if(window.FLASH_GRAFIK)window.FLASH_GRAFIK.surface(mat,type);` (su → stilize su, yaprak → canlı yaprak). Silme.
4. §13.1 yapıldı (`country.bosAlanlar` ağaç/çalı/kaya/çiçek/yol kenarı taşı koymaz). §13.2 yapıldı: `FLASH_GRAFIK.su(...)`.

## 16. GRAFIK API (src/grafik.js, src/core.js)
**Genel görünüm (kendiliğinden):** Bütün `MeshStandardMaterial`/`MeshPhysicalMaterial` gölgelendiricilerine (ShaderLib
düzeyinde, ek çizim/doku yok) "oyuncak" katmanı eklenir: gökyüzü renginde yumuşak kenar parıltısı, yere yakın dik
yüzeylerde temas gölgesi (AO hissi, yalnız sisli sahnede = gezi/yolculuk), alt yüzleri hafif koyulaştırma ve doku
tekrarını kıran çok hafif dünya-uzayı ton gürültüsü. Ülke ajanları normal `MeshStandardMaterial` kullanır, bedava alır.
- Bu katman `#include <roughnessmap_fragment>`, `<aomap_fragment>`, `<opaque_fragment>`, `<fog_vertex>` satırlarını korur;
  kendi `onBeforeCompile` yamalarınız bu `#include` satırlarını yerinde bırakmalı (replace ile sonrasına ekleyin).
  GLSL adlarınız `gz` ile başlamasın (`vGzW`, `vGzUv`, `gzHash`, `gzNoise`, `gzFbm` ayrılmıştır; kullanılabilir de:
  `vGzW` = dünya konumu, her standart malzemede hazır).
- Ton eşleme **Neutral** (doygun renkler). Pastel/açık renkleri olduğundan bir tık doygun seçin; beyaz ≈ 0xf4f0e8.

**Malzeme yardımcıları**
- `FLASH_GRAFIK.su({renk, sig, kenar, kopuk})` → hazır stilize su `MeshStandardMaterial` (dalga çizgileri, kıyı köpüğü,
  güneş pırıltısı, gökyüzü yansıması; dikey yüzeyde akan şelale çizgileri). `kenar:'uv'` (varsayılan) kutu/şerit
  kenarında köpük (UV 0..1 kenarı), `'yok'` köpüksüz. `sig` 0..1 sığlık (açık turkuaz). Paylaşın; `dispose` sizde.
- `FLASH_GRAFIK.waterify(mat, {edge:'uv'|'island'|'none', foam, shallow, island})` var olan malzemeyi suya çevirir
  (önceki `onBeforeCompile`'ı korur, cache anahtarını uzatır).
- `FLASH_GRAFIK.foliage(mat)` yaprak/çiçek: dokunun yeşil tonunu atar, rengi canlandırır, pembe çiçeği açık
  pembe-beyaza çeker, güneşe yumuşak sarma ışık. `FLASH_GRAFIK.surface(mat, tür, ayar)` tür adına göre ikisini seçer.
- `FLASH_GRAFIK.time` paylaşılan saat uniform'u (`{value}` saniye; azaltılmış harekette 0). Kendi shader'ınızda
  `shader.uniforms.gzTime = FLASH_GRAFIK.time` diyebilirsiniz; her kare çizimden önce güncellenir.
- `FLASH_GRAFIK.noise` GLSL metni (`gzHash/gzNoise/gzFbm`) — ShaderMaterial'a ekleyebilirsiniz (standart malzemede zaten var).

**Gökyüzü / ışık**
- Ortak dış gökyüzü (kubbe + 18'e kadar billboard bulut, 2 çizim) sahnede `scene.fog` varken kendiliğinden görünür
  (gezi + yolculuk), uzayda gizlidir. Ülke tonu: `FLASH_GRAFIK.gokyuzu({zenith, sunColor, cloud, haze, cloudTop,
  cloudShadow, clouds})` (surfaces.js her ülkede çağırır). Ufuk rengi her zaman sis rengidir (`C.setSky`).
- Uzak ufuk halkası (tepeler/karlı dağ/kumul/mesa/karst/şehir silüeti, **ağaçsız**, 1 çizim) surfaces.js'te ülkeye göre;
  dekor eklemek isteyen: `FLASH_GRAFIK.horizon({type 0..5, c, c2, snow, city, radius, height, seed, y})`.
  Ek bulut grubu: `FLASH_GRAFIK.clouds({...})`, ek kubbe: `FLASH_GRAFIK.sky({...})` (genelde gerekmez).
- `FLASH_CORE.setAmbience({sky, ground, intensity, exposure})` sisli sahnelerin dolgu ışığı (yarımküre) ve pozlaması;
  surfaces.js ülke kurulurken çağırır, uzay kendi sabit ayarını kullanır. `FLASH_CORE.hemi` yarımküre ışığı.
  Güneş (`C.sun`) rengi/şiddeti eskisi gibi app.js `tourEnvironment` ile. Gölge: tek ışık, PCF + `radius 2.2` (yumuşak kenar),
  boyut profili değişmedi (dokunmatik 512, masaüstü 1024, Akıcı kapalı).
- Mini oyun yakın plan kamerası: gölge kutusu `C.shadowsAt(x,z)` noktasında kalır (değişmedi).

**Hava (weather.js)** kar/yağmur/kiraz yaprağı havuzlarına ek olarak yağmurda yere düşen halkalar, açık/sisli havada
uçuşan polen/toz pırıltıları (her biri 1 çizim, kare başına tampon yüklemesi yok). `FLASH_WEATHER.create(...).profile`
`extra` ve `draws` alanlarında görünür.
**Uzay (space.js)** 4 çizim: boyalı bulutsu arka plan + 720 yıldız + 2 kayan yıldız + 3 taş (AGENTS.md güncellendi).

**GRAFIK performans bütçesi (ebeveyn şartı: M1 iPad'de her zaman akıcı)** — ölçüm dokunmatik benzetimiyle
(C.touch, DPR 1, gölge 512), gölge geçişi dahil tek kare (`info.autoReset=false` + `render`):
| Sahne | önce çizim / üçgen | sonra çizim / üçgen |
|---|---|---|
| Türkiye | 43 / 323k | 46 / 328k |
| Kanada | 47 / 296k | 49 / 301k |
| İngiltere | 45 / 297k | 48 / 302k |
| Japonya | 46 / 299k | 48 / 308k |
| Mısır | 41 / 209k | 44 / 214k |
| İtalya | 44 / 360k | 47 / 364k |
| Avustralya | 49 / 298k | 52 / 302k |
| Uzay (karşılama) | 47 / 59k | 48 / 59k |
- Sınır: ülke sahnesi **≤ ~150 çizim ve ≤ ~400k üçgen (gölge geçişi dahil)**. GRAFIK eklemeleri sahne başına +2–3 çizim,
  +5–10k üçgen (gökyüzü 1, bulut 1, ufuk 1, hava ek havuzu 1; yol kenarı taşları/çimleri mevcut bitki çizimine gömülü).
- Kaçınılan: tam ekran post-process, büyük saydam katmanlar, çok katmanlı sis parçacıkları. Uzay bulutsusu opak tek dörtgen
  (arka plan rengini değiştirir, saydam değil). Bulutlar uzak, küçük, saydam billboard.
- 4× CPU yavaşlatmada (masaüstü) `renderer.render` CPU süresi 2.4–3.6 ms/kare (önce 2.7–3.3 ms); kare 16.7 ms'de sabit.
  GPU süresi headless'ta ölçülemez — fiziksel iPad ölçümü hâlâ yapılmadı.
- **Akıcı** profil: gölge kapalı (değişmedi) + saydam bulut billboard'ları, uzay bulutsusu ve yağmur halkası/polen havuzu kapalı.
- Ülke ajanları: tekrarlayan nesneyi InstancedMesh/birleşik mesh yapın; kendi saydam büyük yüzeylerinizi (su dahil) opak
  tutun (`FLASH_GRAFIK.su` opaktır).
