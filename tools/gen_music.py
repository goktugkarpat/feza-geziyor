#!/usr/bin/env python3
"""Flaş Feza için özgün, sözsüz ve gerçekten dönen bir oyun müziği üretir.

python3 tools/gen_music.py
Gerekli: numpy + ffmpeg (veya imageio-ffmpeg). Oyun sırasında sentez yapılmaz.
Beste: 100 BPM / 4-4 / 32 ölçü / 76,8 saniye; marimba, glockenspiel,
yumuşak pizzicato ve hafif tahta/perküsyon. Melodi aşağıda elle yazılmıştır.
Tüm tınılar matematiksel olarak üretilir; alınmış kayıt veya melodi yoktur.
Geçici WAV/ölçümler dış klasörde tutulur. Çıktı assets/music/world-adventure.mp3.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import wave

import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "music"
SR = 44100
BPM = 100
BEAT = 60 / BPM
BARS = 32
SECONDS = BARS * 4 * BEAT
SAMPLES = round(SECONDS * SR)
RNG = np.random.default_rng(42051)

# Sekiz ölçülük özgün, hatırlanabilir ana motif. (Vuruş, MIDI nota, uzunluk)
MELODY = [
    [(0,72,.75),(1,76,.5),(1.5,79,.5),(2,76,.75),(3,74,.5),(3.5,76,.5)],
    [(0,69,.5),(.75,72,.5),(1.5,76,.75),(2.5,79,.5),(3,76,.75)],
    [(0,77,.75),(1,81,.5),(1.5,79,.5),(2,76,.5),(2.75,74,.5),(3.5,72,.5)],
    [(0,74,.5),(.75,79,.5),(1.5,76,.5),(2,74,.75),(3,67,.7)],
    [(0,72,.5),(.5,74,.5),(1,76,.75),(2,79,.75),(3,76,.75)],
    [(0,69,.75),(1,72,.5),(1.75,77,.75),(2.75,76,.5),(3.5,72,.5)],
    [(0,74,.75),(1,77,.5),(1.5,69,.5),(2,72,.5),(3,74,.8)],
    [(0,71,.5),(.75,74,.5),(1.5,79,.6),(2.5,74,.5),(3,67,.7)],
]
CHORDS = [(48,[60,64,67]), (45,[57,60,64]), (41,[53,57,60]), (43,[55,59,62]),
          (48,[60,64,67]), (41,[53,57,60]), (50,[57,62,65]), (43,[55,59,62])]


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def timeline(seconds):
    return np.arange(round(seconds * SR), dtype=np.float32) / SR


def marimba(note, duration):
    t = timeline(max(.55, duration + .48))
    f = frequency(note)
    y = (np.sin(2*np.pi*f*t)*np.exp(-4.1*t)
         + .16*np.sin(2*np.pi*f*3.97*t)*np.exp(-8.0*t)
         + .028*np.sin(2*np.pi*f*9.12*t)*np.exp(-17*t))
    y *= 1 - np.exp(-t/.006)
    # Tahta tokmağın kısa, yumuşak dokunuşu; sert bir elektronik klik değildir.
    noise = RNG.normal(0, .012, t.size).astype(np.float32)
    y += np.convolve(noise, np.ones(5,dtype=np.float32)/5, mode='same')*np.exp(-95*t)
    return y.astype(np.float32)


def glock(note, duration):
    t = timeline(max(1.0, duration + .88)); f = frequency(note)
    y = np.zeros(t.size, dtype=np.float32)
    for ratio, amplitude, decay in [(1,.75,2.9),(2.756,.13,4.8),(5.404,.045,8.0),(8.933,.015,12)]:
        y += amplitude*np.sin(2*np.pi*f*ratio*t)*np.exp(-decay*t)
    return (y*(1-np.exp(-t/.008))).astype(np.float32)


def pizzicato(note, duration):
    t = timeline(max(.68,duration+.30)); f = frequency(note)
    y = np.zeros(t.size,dtype=np.float32)
    for harmonic in range(1,11):
        ratio = harmonic*math.sqrt(1+.0003*harmonic*harmonic)
        y += np.sin(2*np.pi*f*ratio*t)/(harmonic**1.72)*np.exp(-(5+harmonic*.47)*t)
    return (y*(1-np.exp(-t/.0045))).astype(np.float32)


def percussion(kind):
    t = timeline(.18 if kind=='kick' else .13)
    if kind == 'kick':
        phase = 2*np.pi*(52*t + 29*.022*(1-np.exp(-t/.022)))
        y = np.sin(phase)*np.exp(-25*t)*(1-np.exp(-t/.003))
    elif kind == 'wood':
        y = (np.sin(2*np.pi*630*t)+.23*np.sin(2*np.pi*1060*t))*np.exp(-42*t)*(1-np.exp(-t/.002))
    else:
        noise = RNG.normal(0,1,t.size).astype(np.float32)
        smooth = np.convolve(noise,np.ones(8,dtype=np.float32)/8,mode='same')
        y = (noise-smooth)*np.exp(-32*t)*(1-np.exp(-t/.002))
    return y.astype(np.float32)


def compose():
    song = np.zeros((SAMPLES,2),dtype=np.float32)
    events = []

    def add(sound, when, amplitude, pan, instrument, note=None):
        start = round(when*SR)%SAMPLES
        gains = np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)],dtype=np.float32)*amplitude
        stereo = sound[:,None]*gains[None,:]
        end = min(SAMPLES,start+len(stereo)); song[start:end] += stereo[:end-start]
        # Son ölçüdeki ses ve oda kuyruğu yeni turun başına taşar.
        remaining = len(stereo)-(end-start)
        if remaining: song[:remaining] += stereo[-remaining:]
        events.append({'time':round(when,4),'instrument':instrument,'note':note})

    for bar in range(BARS):
        section = bar//8; chord, notes = CHORDS[bar%8]; origin = bar*4*BEAT
        main = MELODY[bar%8]
        for index,(offset,note,duration) in enumerate(main):
            human = float(RNG.uniform(.94,1.05))
            if section == 1:
                # İkinci bölüm melodiyi ince bir çanla cevaplar.
                instrument = 'glock'; wave_note = glock(note,duration*BEAT); level=.100
            else:
                instrument = 'marimba'; wave_note = marimba(note,duration*BEAT); level=.175 if section!=3 else .145
            jitter = 0 if offset==0 else float(RNG.uniform(-.004,.004))
            add(wave_note,origin+offset*BEAT+jitter,level*human,.03 if section!=1 else .20,instrument,note)
            if section==2 and index in (0,3):
                add(glock(note+12,.24),origin+offset*BEAT+.05,.025,-.26,'glock',note+12)
        # Telli, sıcak bir taban; her ölçüde küçük farklı vurgu.
        for index in range(8):
            note=notes[[0,1,2,1,0,2,1,2][index]]
            amplitude=(.047 if section in (0,2) else .039)*float(RNG.uniform(.92,1.05))
            add(pizzicato(note,.20),origin+(index*.5)*BEAT+.012,amplitude,-.22,'pizzicato',note)
        for beat in (0,2):
            add(pizzicato(chord,.65),origin+beat*BEAT,.075,0,'bass-pizzicato',chord)
            add(percussion('kick'),origin+beat*BEAT,.041,0,'felt-kick')
        for beat in (1,3):
            add(percussion('wood'),origin+beat*BEAT+.009,.024 if section!=3 else .017,.13,'woodblock')
        for beat in range(4):
            add(percussion('shaker'),origin+(beat+.5)*BEAT,.011 if section!=3 else .008,(-.24 if beat%2 else .24),'shaker')
        if section==3 and bar%2==0:
            add(glock(notes[1]+12,.7),origin+2.5*BEAT,.030,-.24,'glock-response',notes[1]+12)

    # Kısa oda yansımaları da daireseldir; tur birleşiminde reverb kesilmez.
    dry = song.copy()
    for delay,gain,swap in [(.071,.11,True),(.119,.075,False),(.187,.043,True),(.311,.022,False)]:
        reflected = np.roll(dry,round(delay*SR),axis=0)
        song += gain*(reflected[:,::-1] if swap else reflected)
    # Yorucu tizleri ve gereksiz çok düşük frekansları yumuşat.
    frequencies = np.fft.rfftfreq(SAMPLES,1/SR)
    response = (frequencies/np.sqrt(frequencies**2+32**2))/(1+(frequencies/6500)**6)
    for channel in range(2):
        song[:,channel] = np.fft.irfft(np.fft.rfft(song[:,channel])*response,n=SAMPLES).astype(np.float32)
    song *= .70/max(.001,float(np.max(np.abs(song))))
    return song,events


def ffmpeg_executable():
    executable = os.environ.get('FLASH_FFMPEG') or shutil.which('ffmpeg')
    if executable: return executable
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError,AttributeError) as error:
        raise SystemExit('ffmpeg gerekli. FLASH_FFMPEG yolunu ver veya imageio-ffmpeg kur.') from error


def write_wav(filename,audio):
    samples = np.round(np.clip(audio,-1,1)*32767).astype('<i2')
    with wave.open(str(filename),'wb') as target:
        target.setnchannels(2); target.setsampwidth(2); target.setframerate(SR); target.writeframes(samples.tobytes())


def measure(ffmpeg,filename):
    result = subprocess.run([ffmpeg,'-hide_banner','-i',str(filename),'-af',
                             'loudnorm=I=-20:TP=-3:LRA=7:print_format=json','-f','null','-'],
                             capture_output=True,text=True,timeout=90,check=True)
    matches = re.findall(r'\{\s*"input_i"[\s\S]*?\}',result.stderr)
    if not matches: raise RuntimeError('Müzik seviye ölçümü bulunamadı.')
    return json.loads(matches[-1])


def db(value):
    return round(20*math.log10(max(float(value),1e-12)),3)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wav',help='İsteğe bağlı dinleme WAV dosyası (oyun dışında).')
    options=parser.parse_args(); ffmpeg=ffmpeg_executable(); OUT.mkdir(parents=True,exist_ok=True)
    song,events=compose(); final=OUT/'world-adventure.mp3'
    with tempfile.TemporaryDirectory(prefix='flash-feza-music-') as temporary:
        raw=Path(temporary)/'score.wav'; decoded=Path(temporary)/'decoded.f32'; write_wav(raw,song)
        measured=measure(ffmpeg,raw)
        normalize='loudnorm=I=-20:TP=-3:LRA=7:linear=true:'+':'.join([
            'measured_I='+measured['input_i'],'measured_TP='+measured['input_tp'],
            'measured_LRA='+measured['input_lra'],'measured_thresh='+measured['input_thresh'],
            'offset='+measured['target_offset']])
        subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(raw),'-af',normalize,
                        '-ar',str(SR),'-ac','2','-c:a','libmp3lame','-b:a','128k','-write_xing','1',
                        '-metadata','title=Feza Dunya Yolu','-metadata','artist=Feza oyunlari - ozgun sentez',
                        str(final)],check=True,timeout=90)
        subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(final),'-ar',str(SR),'-ac','2',
                        '-f','f32le',str(decoded)],check=True,timeout=60)
        audio=np.fromfile(decoded,dtype='<f4').reshape(-1,2)
        if abs(len(audio)-SAMPLES)>1: raise RuntimeError('Döngü uzunluğu kaydıyla eşleşmiyor.')
        level=measure(ffmpeg,final)
        rms=float(np.sqrt(np.mean(audio.astype(np.float64)**2)))
        peak=float(np.max(np.abs(audio))); differences=np.abs(np.diff(audio,axis=0))
        seam=float(np.max(np.abs(audio[0]-audio[-1])))
        window=round(.1*SR)
        report={
            'title':'Feza Dünya Yolu','original':True,'sampleBased':False,'instrumental':True,
            'tempoBpm':BPM,'meter':'4/4','bars':BARS,'loopSeconds':len(audio)/SR,
            'sampleRate':SR,'channels':2,'mp3BitrateKbps':128,'gaplessLameMetadata':True,
            'instruments':['marimba','glockenspiel','pizzicato','felt kick','woodblock','shaker'],
            'sections':['warm main motif','bell response','marimba variation','soft returning motif'],
            'notesAndHits':len(events),'integratedLufs':float(level['input_i']),
            'truePeakDbtp':float(level['input_tp']),'loudnessRangeLu':float(level['input_lra']),
            'rmsDbfs':db(rms),'samplePeakDbfs':db(peak),'clippedSamples':int(np.sum(np.abs(audio)>=1)),
            'loopSeamJumpDbfs':db(seam),'adjacentSampleDeltaP99Dbfs':db(np.percentile(differences,99)),
            'first100msRmsDbfs':db(np.sqrt(np.mean(audio[:window].astype(np.float64)**2))),
            'last100msRmsDbfs':db(np.sqrt(np.mean(audio[-window:].astype(np.float64)**2))),
            'sizeBytes':final.stat().st_size,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),
            'loopDesign':'Circular note tails, short room echoes and frequency shaping. No intro/end silence or fade-out.',
            'source':'Handwritten melody and mathematical instruments in tools/gen_music.py; no borrowed recordings.',
            'score':events
        }
        if report['clippedSamples'] or not -22<=report['integratedLufs']<=-18 or report['truePeakDbtp']>-2:
            raise RuntimeError('Müzik güvenli seviye kontrolünü geçmedi: '+json.dumps(report,ensure_ascii=False))
        if seam>float(np.percentile(differences,99))*.8:
            raise RuntimeError('Döngü birleşiminde beklenmedik keskin geçiş var.')
        (OUT/'world-adventure.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if options.wav:
            destination=Path(options.wav).resolve(); destination.parent.mkdir(parents=True,exist_ok=True)
            subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(final),str(destination)],check=True,timeout=60)
    print(json.dumps({key:report[key] for key in ['loopSeconds','integratedLufs','truePeakDbtp','rmsDbfs','clippedSamples','loopSeamJumpDbfs','sizeBytes']},ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
