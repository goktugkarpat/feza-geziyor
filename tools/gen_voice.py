#!/usr/bin/env python3
"""Flash Feza için doğal Türkçe Emel seslerini üretir.

Kurulum: python3 -m pip install edge-tts imageio-ffmpeg
Çalıştır: python3 tools/gen_voice.py [--hepsi] [--only intro,tr]
İnternet yalnızca kayıt üretirken gerekir. Oyunda MP3 dosyaları çevrimdışı çalar.
Baş/son sessizliği ffmpeg ile kırpılır; araç yoksa kayıt tamamlanmış sayılmaz.
"""
import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

import edge_tts

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "voice"
VOICE = "tr-TR-EmelNeural"
RATE = "-6%"
PITCH = "+0Hz"
LINES = {
    "intro": "Feza ile uzaydayız! Dünyaya bak. Gitmek istediğin ülkenin resmine dokun.",
    "tr": "Türkiye'ye geldik! Galata Kulesi'ni ve uçan balonları bulalım!",
    "us": "Amerika'ya geldik! Elinde meşale tutan büyük heykeli bulalım!",
    "ca": "Kanada'ya geldik! Şelaleyi ve uzun kuleyi bulalım!",
    "be": "Belçika'ya geldik! Parlak topları ve tatlı vafılı bulalım!",
    "fr": "Fransa'ya geldik! Eyfel Kulesi'ne doğru koşalım!",
    "ru": "Rusya'ya geldik! Renkli kubbeleri ve kırmızı kuleleri bulalım!",
    "jp": "Japonya'ya geldik! Karlı dağı ve pembe çiçekleri bulalım!",
    "cn": "Çin'e geldik! Uzun duvarı ve mavi çatılı tapınağı bulalım!",
    "eg": "Mısır'a geldik! Üçgen piramitleri ve büyük Sfenks'i bulalım!",
    "br": "Brezilya'ya geldik! Büyük heykeli ve kumsalı bulalım!",
    "found": "Yeni bir yer buldun! Resmini gezi defterimize koyuyoruz.",
    "travel": "Şimşek gibi koş! Yeni bir ülkeye gidiyoruz!",
    "travel-space": "Uzay mekiğimizle dünyaya iniyoruz! Pencereden bak, seçtiğin ülke bizi bekliyor.",
    "travel-land": "Şimdi karadayız! Ağaçların ve tepelerin yanından koşuyoruz.",
    "travel-water": "Suya geldik! Feza dalgaların üstünde koşuyor.",
    "travel-arrive": "Yeni ülke göründü! Keşfe hazır ol.",
    "choose-tr": "Türkiye! Galata Kulesi'ni ve uçan balonları görelim!",
    "choose-us": "Amerika! Büyük heykeli ve köprüyü görelim!",
    "choose-ca": "Kanada! Şelaleyi ve uzun kuleyi görelim!",
    "choose-be": "Belçika! Parlak topları ve tatlı vafılı görelim!",
    "choose-fr": "Fransa! Eyfel Kulesi'ni görelim!",
    "choose-ru": "Rusya! Renkli kubbeleri görelim!",
    "choose-jp": "Japonya! Karlı dağı ve pembe çiçekleri görelim!",
    "choose-cn": "Çin! Uzun duvarı ve mavi tapınağı görelim!",
    "choose-eg": "Mısır! Üçgen piramitleri görelim!",
    "choose-br": "Brezilya! Büyük heykeli ve kumsalı görelim!",
    "place-tr-galata": "Bu Galata Kulesi! İstanbul'da yükselen eski bir kule. Etrafında bir tur koş!",
    "place-tr-bosphorus": "Bu İstanbul Boğazı! Bir kıyısı Avrupa, öbür kıyısı Asya. İki kıtaya el salla!",
    "place-tr-cappadocia": "Burası Kapadokya! Rüzgâr ve su bu ilginç kayaları şekillendirmiş. Uçan balonları bul!",
    "place-us-liberty": "Bu Özgürlük Heykeli! Elinde bir meşale tutuyor. Sen de bir kahraman pozu ver!",
    "place-us-brooklyn": "Bu Bruklin Köprüsü! Şehrin iki yanını birbirine bağlıyor. İki büyük taş kulesini bul!",
    "place-us-centralpark": "Burası Sentral Park! Büyük binaların arasında yemyeşil bir park. Ağaçların yanında koş!",
    "place-ca-niagara": "Bu Niyagara Şelaleleri! Sular yüksekten köpürerek akıyor. Şelalenin yanında bir tur koş!",
    "place-ca-cntower": "Bu Toronto Kulesi! Çok yüksek bir kule. Yukarıdaki yuvarlak bölümü bul!",
    "place-ca-hockey": "Burada buz hokeyi oynanıyor! Hokey Kanada'nın kış sporu. Buz pistinin etrafında koş!",
    "place-be-atomium": "Bu Atomium! Dokuz parlak topu var. Topları birlikte sayalım!",
    "place-be-grandplace": "Burası Brüksel'in Büyük Meydanı! Etrafında süslü binalar var. Altın renkli çatıları bul!",
    "place-be-waffle": "Bu bir vafıl tezgâhı! Vafıl, Belçika'nın sevilen tatlılarından biri. Tatlı bir mola verelim!",
    "place-fr-eiffel": "Bu Eyfel Kulesi! Paris'te demirden yapılmış yüksek bir kule. Dört ayağını bul!",
    "place-fr-louvre": "Bu Luvr Müzesi! Önünde camdan bir piramit var. Piramidin etrafında koş!",
    "place-fr-seine": "Bu Sen Nehri! Paris'in içinden akıyor. Suyun yanındaki küçük tekneyi bul!",
    "place-ru-basils": "Bu Aziz Vasil Katedrali! Moskova'da rengârenk kubbeleri var. Kaç renk görebiliyorsun?",
    "place-ru-kremlin": "Bu Kremlin! Moskova'da kırmızı duvarları ve kuleleri var. Kulelere doğru koş!",
    "place-ru-redsquare": "Burası Kızıl Meydan! Moskova'da kocaman bir meydan. Ortasında bir hız turu yap!",
    "place-jp-fuji": "Bu Fuji Dağı! Japonya'nın en yüksek dağı. Karlı zirvesini bul!",
    "place-jp-torii": "Bu Torii Kapısı! Japonya'da tapınakların girişinde böyle kapılar var. Kırmızı kapıyı bul!",
    "place-jp-sakura": "Bunlar kiraz çiçekleri! Japonya'da ilkbaharda açıyorlar. Pembe ağaçların arasından koş!",
    "place-cn-greatwall": "Bu Çin Seddi! Uzun bir duvar ve birçok kulesi var. Kıvrılan duvarı izle!",
    "place-cn-heaven": "Bu Gök Tapınağı! Pekin'de yuvarlak bir tapınak. Üst üste duran mavi çatıları bul!",
    "place-cn-bamboo": "Bunlar bambular! Çin'de bahçelerde yetişirler. Uzun yeşil sapların arasındaki yolu bul!",
    "place-eg-pyramids": "Bunlar Gize Piramitleri! Çok eski, kocaman taş yapılar. Üç piramidi de bul!",
    "place-eg-sphinx": "Bu Büyük Sfenks! İnsan başı ve aslan gövdesi var. Kocaman patilerine bak!",
    "place-eg-nile": "Bu Nil Nehri! Mısır'daki tarlalara su veriyor. Küçük yelkenli tekneyi bul!",
    "place-br-christ": "Bu Rio'nun büyük heykeli! Yüksek bir tepede kollarını açmış. Sen de kollarını aç!",
    "place-br-sugarloaf": "Bu Şeker Tepesi! Brezilya'da denizin yanında yükseliyor. Küçük teleferik kabinini bul!",
    "place-br-copacabana": "Burası Kopakabana Sahili! Brezilya'da okyanusun yanında bir kumsal. Renkli şemsiyeleri bul!",
    "help-start": "Uzaydayız! Dünyaya bak. Bir ülkenin resmine dokun, oraya inelim!",
    "help-map": "Dünyayı çevir, iki parmakla büyüt. Gitmek istediğin ülkenin resmine dokun!",
    "help-tour": "Parmağını sürükle, Feza koşsun! Yaklaşınca oyun başlar. Dünya kapısından geç, yeni ülke seç.",
    "help-speed": "Daha hızlı koşmak için şimşek düğmesini basılı tut!",
    "help-passport": "Bu senin gezi defterin! Bulduğun yerlerin resimleri burada. Bir resme dokun, sana anlatayım!",
    "help-photo": "Fotoğraf makinesine dokun. Feza'nın bu güzel yerdeki resmini çekelim!",
    "help-route": "Resimdeki yere gidiyoruz. Yerdeki sarı çizgiyi takip et!",
    "country-tap": "Bir ülkenin resmine dokun, oraya gidelim!",
    "portal": "Başka bir ülkeye gitmek için dünyalı kapının içinden koş.",
    "portal-travel": "Dünya bizi bekliyor! Bir ülkenin resmine dokun.",
    "challenge-start": "Şimşek avı başlıyor! Sarı halkaların içinden koş. Beşini de bul!",
    "challenge-found": "Bir şimşek daha buldun! Haydi, sıradakine koş!",
    "challenge-done": "Beş şimşeğin hepsini buldun! Harika bir hız turuydu!",
    "activity-flowers": "Haydi koş, çiçekler rengârenk açılsın!",
    "activity-wind": "Koş bakalım! Rüzgâr değirmenleri fırıl fırıl dönsün!",
    "activity-splash": "Su birikintilerine koş! Şıp şıp, sular sıçrasın!",
    "activity-balloons": "Koşalım, renkli uçurtmaları uçuralım!",
    "activity-ball": "Toplara doğru koş! Rengârenk toplar yuvarlansın!",
    "activity-butterflies": "Kelebeklere yaklaş! Renkli kanatlarını açsınlar!",
    "activity-rings": "Şimşek gibi koş! Sarı halkaların içinden geçelim!",
    "activity-done-1": "Ne güzel oynadık! Şimdi gezmeye devam edelim.",
    "activity-done-2": "Bak, burası neşeyle doldu! Yeni bir oyun bulalım.",
    "activity-done-3": "Harika bir turdu! Haydi, dünyayı gezmeye devam!",
}
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.035:detection=peak,"
    "areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12:detection=peak,areverse,"
    "afade=t=in:d=0.006"
)


def find_ffmpeg():
    executable = os.environ.get("FLASH_FFMPEG") or shutil.which("ffmpeg")
    if executable:
        return executable
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as exc:
        raise SystemExit("ffmpeg yok. 'pip install imageio-ffmpeg' ile kurabilirsin.") from exc


def recording_hash(text):
    return hashlib.sha256(f"{VOICE}|{RATE}|{PITCH}|{TRIM}|{text}".encode("utf-8")).hexdigest()


def measure(ffmpeg, path):
    process = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path), "-f", "null", "-"],
                             capture_output=True, text=True, timeout=30)
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", process.stderr)
    if process.returncode or not match:
        raise RuntimeError(f"MP3 doğrulanamadı: {path.name}")
    return int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3])


async def record(key, text, ffmpeg, semaphore):
    async with semaphore:
        with tempfile.TemporaryDirectory(prefix="flash-feza-voice-") as directory:
            raw = Path(directory) / "raw.mp3"
            trimmed = Path(directory) / "trimmed.mp3"
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(str(raw))
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(1 + attempt)
            subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", str(raw), "-af", TRIM,
                            "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k",
                            str(trimmed)], check=True, timeout=60)
            seconds = measure(ffmpeg, trimmed)
            if seconds < 0.5 or trimmed.stat().st_size < 1000:
                raise RuntimeError(f"Geçersiz kayıt: {key}")
            shutil.copyfile(trimmed, OUT / f"{key}.mp3")
            print(f"{key}: {seconds:.2f} saniye", flush=True)
            return key, {"text": text, "duration": round(seconds, 3), "hash": recording_hash(text)}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hepsi", action="store_true")
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    selected = set(args.only.split(",")) if args.only else set(LINES)
    unknown = selected - LINES.keys()
    if unknown:
        raise SystemExit("Bilinmeyen ses: " + ", ".join(sorted(unknown)))
    ffmpeg = find_ffmpeg()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "lines.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    records = manifest.get("lines", {})
    todo = [(key, text) for key, text in LINES.items() if key in selected and (
        args.hepsi or not (OUT / f"{key}.mp3").exists() or records.get(key, {}).get("hash") != recording_hash(text))]
    semaphore = asyncio.Semaphore(3)
    for key, data in await asyncio.gather(*(record(key, text, ffmpeg, semaphore) for key, text in todo)):
        records[key] = data
    manifest = {"voice": VOICE, "rate": RATE, "pitch": PITCH, "trimmed": True, "lines": records}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    missing = [key for key in LINES if not (OUT / f"{key}.mp3").exists()]
    print(f"{len(records)} ses kaydı hazır.")
    if missing:
        raise SystemExit("Eksik sesler: " + ", ".join(missing))


if __name__ == "__main__":
    asyncio.run(main())
