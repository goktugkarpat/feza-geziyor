"""Özgün beş notalı çan ve kısa bitiriş sesi. Dış kayıt/dependency yok."""
from pathlib import Path
import math
import struct
import wave

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'music'
RATE = 22050
NOTES = [523.25, 587.33, 659.25, 783.99, 880.00]

def render(name, notes):
    duration = max(at for at, _ in notes) + .65
    frames = bytearray()
    for i in range(int(RATE * duration)):
        t = i / RATE
        sample = 0
        for at, pitch in notes:
            age = t - at
            if 0 <= age < .65:
                envelope = min(1, age / .008) * math.exp(-age * 7) * min(1, (.65-age)/.04)
                sample += envelope * (math.sin(2*math.pi*pitch*age) + .22*math.sin(2*math.pi*pitch*2.01*age)) * .22
        frames += struct.pack('<h', int(max(-1,min(1,sample))*32767))
    with wave.open(str(OUT / name), 'wb') as sound:
        sound.setnchannels(1); sound.setsampwidth(2); sound.setframerate(RATE); sound.writeframes(frames)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for i, pitch in enumerate(NOTES): render(f'chime-{i+1}.wav', [(0, pitch)])
    render('chime-finale.wav', [(i*.12,pitch) for i,pitch in enumerate(NOTES)])
