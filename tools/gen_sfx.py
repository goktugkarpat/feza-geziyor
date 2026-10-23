#!/usr/bin/env python3
"""Kısa oyun efektlerini kodla üretir (telifsiz, özgün): assets/sfx/<ad>.mp3.
Çalıştır: python3 tools/gen_sfx.py   (numpy + ffmpeg gerekir). Bilbo'nun havlaması gerçek kayıttır (KAYNAKLAR.md)."""
import subprocess, tempfile, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sfx"
SR = 24000
rng = np.random.default_rng(7)

def t(sure): return np.arange(int(SR * sure)) / SR
def zarf(n, atak=0.01, birak=0.2):
    e = np.ones(n); a = max(1, int(SR * atak)); r = max(1, int(SR * birak))
    e[:a] = np.linspace(0, 1, a); e[-r:] *= np.linspace(1, 0, r); return e
def alcak(x, k):  # basit tek kutuplu alçak geçiren
    y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x): acc += k * (v - acc); y[i] = acc
    return y

def vapur_duduk():
    x = t(1.7); f = 155
    s = sum(np.sin(2 * np.pi * f * h * x) / h for h in (1, 2, 3, 4, 5)) + 0.6 * sum(np.sin(2 * np.pi * f * 1.5 * h * x) / h for h in (1, 2, 3))
    s *= 1 + 0.05 * np.sin(2 * np.pi * 5 * x)
    return s * zarf(len(x), 0.12, 0.45) * 0.22

def balon_ates():
    x = t(1.3); n = rng.standard_normal(len(x))
    s = alcak(n, 0.12) * 2.2 + alcak(n, 0.5) * 0.3
    return s * zarf(len(x), 0.08, 0.5) * (1 + 0.3 * np.sin(2 * np.pi * 9 * x)) * 0.5

def simit_at():
    x = t(0.32); n = rng.standard_normal(len(x)); k = np.linspace(0.05, 0.4, len(x))
    y = np.zeros_like(n); acc = 0.0
    for i, v in enumerate(n): acc += k[i] * (v - acc); y[i] = acc
    return y * np.sin(np.pi * np.linspace(0, 1, len(x))) * 0.9

def su_sicrama():
    x = t(0.7); n = rng.standard_normal(len(x))
    s = alcak(n, 0.35) * np.exp(-x * 7) * 1.4
    for k in range(5):
        st = int(SR * (0.08 + k * 0.09)); ln = int(SR * 0.06); f0 = 500 + 260 * k
        xx = np.arange(ln) / SR; s[st:st + ln] += 0.25 * np.sin(2 * np.pi * (f0 + 2500 * xx) * xx) * np.exp(-xx * 50)
    return s * 0.6

def cikartma():
    s = np.zeros(int(SR * 0.6))
    for k, f in enumerate((880, 1320, 1760)):
        st = int(SR * k * 0.09); x = t(0.3)
        tone = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2 * x)) * np.exp(-x * 12)
        s[st:st + len(x)] += tone[: len(s) - st]
    return s * 0.35

def damga():
    x = t(0.45); s = np.sin(2 * np.pi * (95 - 40 * x) * x) * np.exp(-x * 14) * 1.2
    n = rng.standard_normal(len(x)) * np.exp(-x * 60) * 0.5
    return (s + alcak(n, 0.6)) * 0.6

def sayfa():
    x = t(0.3); n = rng.standard_normal(len(x))
    return (n - alcak(n, 0.3)) * np.sin(np.pi * np.linspace(0, 1, len(x))) ** 2 * 0.25

EFEKTLER = {"vapur-duduk": vapur_duduk, "balon-ates": balon_ates, "simit-at": simit_at, "su-sicrama": su_sicrama,
            "cikartma": cikartma, "damga": damga, "sayfa": sayfa}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for ad, f in EFEKTLER.items():
        s = f(); s = s / max(1e-6, np.abs(s).max()) * 0.8
        with tempfile.TemporaryDirectory() as d:
            w = Path(d) / "a.wav"
            with wave.open(str(w), "wb") as wf:
                wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((s * 32767).astype(np.int16).tobytes())
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(w), "-ac", "1", "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "48k", str(OUT / f"{ad}.mp3")], check=True)
        print(ad, "hazır")

if __name__ == "__main__":
    main()
