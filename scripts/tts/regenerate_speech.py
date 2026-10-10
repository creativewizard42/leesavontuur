"""Regenerate Dutch synthetic audio with explicit IPA for teaching sounds.

Never marks a recording human or listening-approved. Human-reviewed files are
preserved. Run vite-node scripts/speech-plan.ts first. No runtime TTS dependency.
"""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
from piper.voice import PiperVoice
from piper.config import SynthesisConfig

parser = argparse.ArgumentParser()
parser.add_argument('--model-dir', type=Path, required=True)
parser.add_argument('--repair-phonetics', action='store_true', help='Regenerate clips affected by the Dutch model phonetic equivalents')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
plan = json.loads((root / 'docs/audio/speech-plan.json').read_text())
model_path = args.model_dir / 'nl_NL-pim-medium.onnx'
voice = PiperVoice.load(model_path)
rate = voice.config.sample_rate
graphemes = {g['id']: g for g in plan['graphemes']}
words = {w['word']: w['graphemes'] for w in plan['words']}
config = SynthesisConfig(length_scale=1.06, noise_scale=0.3, noise_w_scale=0.3, normalize_audio=False)
sound_config = SynthesisConfig(length_scale=1.16, noise_scale=0.25, noise_w_scale=0.25, normalize_audio=False)
reviews = json.loads((root / 'docs/audio/review.json').read_text())
previous = json.loads((root / 'public/audio/provenance.json').read_text())
records = {entry['src']: entry for entry in previous['clips']}
cache = {}

def silence(seconds):
    return np.zeros(round(rate * seconds), dtype=np.float32)

def trim(samples):
    samples = np.asarray(samples, dtype=np.float32)
    peak = float(np.max(np.abs(samples))) if len(samples) else 0
    if peak < 0.00001:
        raise ValueError('Empty or silent speech')
    active = np.flatnonzero(np.abs(samples) > max(0.001, peak * 0.012))
    return samples[max(0, active[0] - int(rate * .035)):min(len(samples), active[-1] + int(rate * .07))]

def phones(ipa, sound=False):
    # Match the Dutch eSpeak symbols this model was trained with. These are
    # phonetic variants of the school IPA, not spelling/letter-name guesses.
    ipa = ipa.replace('ɦ', 'h').replace('ʏ', 'ɵ').replace('ɛi', 'ɛɪ').replace('ʌu', 'ʌʊ')
    key = ('ipa', ipa, sound)
    if key not in cache:
        phonemes = list(ipa)
        unknown = set(phonemes) - set(voice.config.phoneme_id_map)
        if unknown:
            raise ValueError(f'Unsupported phonemes: {unknown}')
        cache[key] = trim(voice.phoneme_ids_to_audio(voice.phonemes_to_ids(phonemes), sound_config if sound else config))
    return cache[key].copy()

def speech(text):
    text = text.strip().replace('…', '.').replace('één', 'een')
    if not text:
        return silence(.02)
    key = ('text', text)
    if key not in cache:
        chunks = [trim(chunk.audio_float_array) for chunk in voice.synthesize(text, config)]
        cache[key] = np.concatenate([part for i, chunk in enumerate(chunks) for part in ([silence(.16), chunk] if i else [chunk])])
    return cache[key].copy()

def sound(gid):
    ipa = graphemes[gid]['ipa']
    if graphemes[gid]['type'].startswith('vowel') or graphemes[gid]['type'] == 'diphthong':
        ipa = 'ˈ' + ipa
    return phones(ipa, sound=True)

def blend(word):
    if word not in words:
        raise ValueError(f'No explicit segmentation: {word}')
    return np.concatenate([part for i, gid in enumerate(words[word]) for part in ([silence(.16), sound(gid)] if i else [sound(gid)])])

def word_audio(word):
    weak = {'de': 'də', 'een': 'ən', 'het': 'hɛt', 'ze': 'zə', 'we': 'ʋə', 'je': 'jə'}
    if word in weak:
        return phones(weak[word])
    if word not in words:
        return speech(word)
    units = [graphemes[g]['ipa'] for g in words[word]]
    # Dutch final devoicing: never say a spelling-based voiced final d/b.
    units[-1] = {'d': 't', 'b': 'p', 'v': 'f', 'z': 's', 'ɣ': 'x'}.get(units[-1], units[-1])
    for i, gid in enumerate(words[word]):
        if graphemes[gid]['type'].startswith('vowel') or graphemes[gid]['type'] == 'diphthong':
            units[i] = 'ˈ' + units[i]
            break
    return phones(''.join(units))

def joined(*parts):
    return np.concatenate([part for i, samples in enumerate(parts) for part in ([silence(.16), samples] if i else [samples])])

def render(entry):
    key, kind, text = entry['key'], entry['kind'], entry['text']
    if kind == 'grapheme-sound':
        return sound(key.split('.')[1]), 'explicit-ipa'
    if kind == 'blend':
        return blend(key.removeprefix('blend.')), 'segmented-ipa'
    if kind in ('word', 'grapheme-example', 'sightword'):
        return word_audio(text), 'word-ipa' if text in words or kind == 'sightword' else 'dutch-text'
    gid = key.rsplit('.', 1)[-1]
    prefixes = {
        'instr.fn.first_sound': 'Welk woord begint met deze klank?',
        'instr.klankjager.first': 'Welk woord begint met deze klank?',
        'instr.fn.last_sound': 'Welk woord eindigt op deze klank?',
        'instr.klankjager.last': 'Welk woord eindigt op deze klank?',
        'instr.lk.sound_to_grapheme': 'Welke letter hoort bij deze klank?',
        'instr.letterklank.r2': 'Welke letter hoort bij deze klank?',
        'fb.specific.first_sound': 'Luister naar de eerste klank.',
        'fb.specific.last_sound': 'Luister naar de laatste klank.',
        'fb.specific.middle_sound': 'Luister naar de klank in het midden.',
        'fb.specific.middle_consonant': 'Luister naar de klank in het midden.',
        'fb.specific.letter_sound': 'Deze letter hoort bij deze klank.',
        'fb.specific.letter_confusion': 'Luister goed naar deze klank.',
    }
    base = key.rsplit('.', 1)[0]
    if gid in graphemes and base in prefixes:
        return joined(speech(prefixes[base]), sound(gid)), 'speech-with-explicit-ipa'
    if gid in graphemes and base == 'instr.lk.intro':
        return joined(speech('Dit is de letter ' + graphemes[gid]['name'] + '.'), speech('Luister naar de klank.'), sound(gid)), 'speech-with-explicit-ipa'
    if key.startswith('fb.specific.blend_retry.'):
        return joined(speech('Luister naar de losse klanken.'), blend(gid), speech('Welk woord hoor je?')), 'speech-with-segmented-ipa'
    return speech(text), 'dutch-text'

with tempfile.TemporaryDirectory() as temporary:
    for index, entry in enumerate(plan['clips']):
        target = root / 'public' / entry['src']
        if args.repair_phonetics:
            gid = entry['key'].rsplit('.', 1)[-1]
            word = entry['key'].removeprefix('blend.') if entry['kind'] == 'blend' else entry['text'] if entry['kind'] in ('word', 'grapheme-example') else gid
            affected = {'h', 'u', 'ij', 'ei', 'ou', 'au'}
            if not ((entry['kind'] == 'grapheme-sound' and entry['key'].split('.')[1] in affected) or
                    (entry['key'].startswith('instr.lk.intro.')) or
                    (records.get(entry['src'], {}).get('method') in ('speech-with-explicit-ipa',) and gid in affected) or
                    (records.get(entry['src'], {}).get('method') in ('word-ipa', 'segmented-ipa', 'speech-with-segmented-ipa') and any(g in affected for g in words.get(word, [])))):
                continue
        if target.exists() and any(r.get('approved') and r.get('src') == entry['src'] and r.get('sha256') == hashlib.sha256(target.read_bytes()).hexdigest() for r in reviews):
            continue
        # Preserve any existing asset not recorded as synthetic.
        if target.exists() and entry['src'] not in records:
            raise ValueError(f'Unidentified existing recording: {target}')
        samples, method = render(entry)
        samples = np.concatenate([silence(.045), samples, silence(.08)])
        if not .08 < len(samples) / rate < 90:
            raise ValueError(f'Invalid duration: {entry["key"]}')
        rms = float(np.sqrt(np.mean(samples ** 2)))
        samples *= min(.0794 / max(rms, .00001), .79 / float(np.max(np.abs(samples))))
        wav = Path(temporary) / 'clip.wav'
        sf.write(wav, samples, rate, subtype='PCM_16')
        target.parent.mkdir(parents=True, exist_ok=True)
        encoded = Path(temporary) / 'clip.mp3'
        subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-ar', '44100', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', str(encoded)], check=True)
        target.write_bytes(encoded.read_bytes())
        records[entry['src']] = { 'key': entry['key'], 'src': entry['src'], 'text': entry['text'],
            'origin': 'synthetic-draft', 'voice': 'Piper nl_NL-pim-medium', 'method': method,
            'reviewed': False, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'durationSeconds': round(len(samples) / rate, 3) }
        (root / 'public/audio/provenance.json').write_text(json.dumps({
            'schemaVersion': 1, 'generator': 'piper-tts 1.3.0; nl_NL-pim-medium; explicit Dutch IPA; length_scale 1.06/1.16',
            'modelSource': 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-nl_NL-pim-medium.tar.bz2',
            'modelSha256': hashlib.sha256(model_path.read_bytes()).hexdigest(),
            'datasetLicense': 'CC0 (bundled MODEL_CARD); not a claim about complete model licensing',
            'clips': sorted(records.values(), key=lambda record: record['src']) }, ensure_ascii=False, indent=2) + '\n')
        if index % 50 == 0:
            print(f'{index + 1}/{len(plan["clips"])} clips regenerated', flush=True)
print('All catalogued clips processed. Synthetic speech still requires listening review.', flush=True)
