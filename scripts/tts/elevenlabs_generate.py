"""Budgeted Jessica speech generation with reusable phrases and explicit phoneme preservation.

Plan is the default. --generate downloads to a persistent external cache.
--apply validates all inputs, then replaces only synthetic catalog assets.
No API credential, child data or network dependency is added to the application.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
VOICE = 'cgSgspJ2msm6clMCkdW9'
MODEL = 'eleven_multilingual_v2'
RATE = 44100
SETTINGS = {
    'celebrate': dict(stability=.35, similarity_boost=.75, style=.5, speed=.98, use_speaker_boost=True),
    'instruction': dict(stability=.5, similarity_boost=.75, style=.15, speed=.90, use_speaker_boost=True),
    'word': dict(stability=.5, similarity_boost=.75, style=.1, speed=.90, use_speaker_boost=True),
}
PREFIXES = {
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


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic_json(path, value):
    temporary = path.with_suffix('.tmp.json')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def speech(text, role='instruction'):
    return {'text': text, 'role': role}


def existing(src):
    return {'existing': src}


def parts_for(clip, graphemes):
    key, kind, text = clip['key'], clip['kind'], clip['text']
    base, gid = key.rsplit('.', 1)
    if kind in ('grapheme-sound', 'blend'):
        return None  # Never submit phonetic spellings as natural-language text.
    if kind in ('word', 'sightword', 'grapheme-example', 'grapheme-name'):
        return [speech(text, 'word')]
    if base in PREFIXES and gid in graphemes:
        return [speech(PREFIXES[base]), existing(f'audio/graphemes/{gid}_sound.mp3')]
    if base == 'instr.lk.intro' and gid in graphemes:
        return [speech('Dit is de letter.'), speech(graphemes[gid]['name'], 'word'),
                speech('Luister naar de klank.'), existing(f'audio/graphemes/{gid}_sound.mp3')]
    if base == 'fb.specific.blend_retry':
        return [speech('Luister naar de losse klanken.'), existing(f'audio/blends/{gid}.mp3'), speech('Welk woord hoor je?')]
    if base == 'fb.specific.order':
        return [speech('We lezen van links naar rechts.'), speech(gid, 'word'), speech('Probeer het nog eens.')]
    if base in ('instr.klim', 'instr.klimboom'):
        return [speech('Zoek dit woord.'), speech(gid, 'word')]
    if base == 'instr.ph.rhyme':
        return [speech('Welk woord rijmt op dit woord?'), speech(gid, 'word')]
    if base == 'instr.ph.syllable':
        return [speech('Hoeveel klappen hoor je in dit woord?'), speech(gid, 'word')]
    role = 'celebrate' if key.startswith(('fb.correct.', 'fb.reward.', 'fb.letterarrive.', 'fb.nav.done.', 'fb.nav.stop.')) else 'instruction'
    return [speech(text, role)]


def body_for(part):
    return {'text': part['text'], 'model_id': MODEL, 'language_code': 'nl', 'voice_settings': SETTINGS[part['role']]}


def signature(part):
    return digest(json.dumps({'voice': VOICE, 'request': body_for(part)}, sort_keys=True).encode())


def decode(path):
    data = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-ar', str(RATE), '-ac', '1', '-f', 'f32le', '-'])
    samples = np.frombuffer(data, dtype='<f4').copy()
    if len(samples) < RATE * .05 or not np.isfinite(samples).all() or np.max(np.abs(samples)) < .005:
        raise ValueError(f'Invalid or silent audio: {path.name}')
    return samples


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/workspace/.leesavontuur-tools/elevenlabs-jessica'))
    parser.add_argument('--budget-characters', type=int, default=8000)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    plan = json.loads((ROOT / 'docs/audio/speech-plan.json').read_text())
    graphemes = {g['id']: g for g in plan['graphemes']}
    outputs = [(clip, parts_for(clip, graphemes)) for clip in plan['clips']]
    outputs = [(clip, parts) for clip, parts in outputs if parts is not None]
    requests = {signature(part): part for _, parts in outputs for part in parts if 'text' in part}
    total = sum(len(part['text']) for part in requests.values())
    report = {'voice': VOICE, 'model': MODEL, 'outputClips': len(outputs),
              'preservedPhonemeAndBlendClips': len(plan['clips']) - len(outputs),
              'uniqueRequests': len(requests), 'textCharacters': total, 'budgetCharacters': args.budget_characters}
    print(json.dumps(report), flush=True)
    if total > args.budget_characters:
        raise SystemExit('Plan exceeds the character budget; no requests or replacements made.')
    if not args.generate and not args.apply:
        return
    args.cache.mkdir(parents=True, exist_ok=True)
    ledger_path = args.cache / 'ledger.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {'charactersReserved': 0, 'requests': {}}
    pending = []
    for key, part in requests.items():
        target = args.cache / (key + '.mp3')
        record = ledger['requests'].get(key)
        if target.exists():
            if not record or record.get('sha256') != digest(target.read_bytes()):
                raise SystemExit('Unverified existing cache file; refusing reuse.')
        else:
            pending.append((key, part))
    if args.generate and pending:
        if ledger['charactersReserved'] + sum(len(part['text']) for _, part in pending) > args.budget_characters:
            raise SystemExit('Remaining requests exceed the cumulative budget; no further requests made.')
        token = os.environ.get('LEESAVONTUUR_ELEVENLABS_KEY')
        if not token:
            raise SystemExit('Missing secure LEESAVONTUUR_ELEVENLABS_KEY binding.')
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *a, **kw):
                return None
        client = urllib.request.build_opener(NoRedirect())
        for index, (key, part) in enumerate(pending):
            # Reserve before sending: interrupted calls cannot silently spend twice.
            ledger['charactersReserved'] += len(part['text'])
            atomic_json(ledger_path, ledger)
            request = urllib.request.Request(
                f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',
                data=json.dumps(body_for(part)).encode(),
                headers={'xi-api-key': token, 'Content-Type': 'application/json'})
            try:
                with client.open(request, timeout=90) as response:
                    data = response.read()
            except urllib.error.HTTPError as exc:
                raise SystemExit(f'ElevenLabs HTTP {exc.code}; stopped without retries or production changes.') from None
            except urllib.error.URLError:
                raise SystemExit('ElevenLabs connection failed; stopped without retries or production changes.') from None
            temporary = args.cache / (key + '.part.mp3')
            temporary.write_bytes(data)
            decode(temporary)
            target = args.cache / (key + '.mp3')
            temporary.replace(target)
            ledger['requests'][key] = {'text': part['text'], 'role': part['role'], 'sha256': digest(data)}
            atomic_json(ledger_path, ledger)
            print(f'{index + 1}/{len(pending)} fragments; {ledger["charactersReserved"]} characters reserved', flush=True)
    if not args.apply:
        return
    if any(not (args.cache / (key + '.mp3')).exists() for key in requests):
        raise SystemExit('Some requests are missing; production files unchanged.')
    provenance_path = ROOT / 'public/audio/provenance.json'
    provenance = json.loads(provenance_path.read_text())
    records = {r['src']: r for r in provenance['clips']}
    reviews = json.loads((ROOT / 'docs/audio/review.json').read_text())
    approved = {r['src'] for r in reviews if r.get('approved')}
    # Validate every original before changing any file; protect human/reviewed assets.
    for clip, parts in outputs:
        src = clip['src']
        if src in approved:
            raise SystemExit('Reviewed asset encountered; preserve it and revise the plan.')
        old = records.get(src)
        if not old or old['origin'] != 'synthetic-draft' or old['sha256'] != digest((ROOT / 'public' / src).read_bytes()):
            raise SystemExit(f'Untracked or changed source recording: {src}')
    speech_audio = {key: decode(args.cache / (key + '.mp3')) for key in requests}
    retained_sources = {part['existing'] for _, parts in outputs for part in parts if 'existing' in part}
    retained_audio = {src: decode(ROOT / 'public' / src) for src in retained_sources}
    with tempfile.TemporaryDirectory(prefix='leesavontuur-jessica-') as staging:
        def render(entry):
            clip, parts = entry
            segments = [speech_audio[signature(part)] if 'text' in part else retained_audio[part['existing']] for part in parts]
            silence = np.zeros(round(RATE * .16), dtype=np.float32)
            samples = np.concatenate([piece for i, segment in enumerate(segments) for piece in ([silence, segment] if i else [segment])])
            rms = float(np.sqrt(np.mean(samples ** 2)))
            samples *= min(.0794 / max(rms, .00001), .79 / float(np.max(np.abs(samples))))
            target = Path(staging) / clip['src']
            target.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', 'pipe:0',
                            '-codec:a', 'libmp3lame', '-b:a', '128k', str(target)], input=samples.astype('<f4').tobytes(), check=True)
            result = dict(key=clip['key'], src=clip['src'], text=clip['text'], origin='synthetic-draft',
                          voice='ElevenLabs Jessica' + (' + Piper teaching sounds' if any('existing' in p for p in parts) else ''),
                          voiceId=VOICE, model=MODEL, method='composed-speech' if len(parts) > 1 else 'dutch-text',
                          parts=parts, reviewed=False, sha256=digest(target.read_bytes()), durationSeconds=round(len(samples) / RATE, 3))
            return target, result
        with ThreadPoolExecutor(max_workers=4) as pool:
            rendered = list(pool.map(render, outputs))
        for source, record in rendered:
            target = ROOT / 'public' / record['src']
            target.write_bytes(source.read_bytes())
            records[record['src']] = record
        provenance['generator'] = 'ElevenLabs Jessica multilingual_v2; retained Piper teaching phonemes and blends (see per-file provenance)'
        provenance['clips'] = sorted(records.values(), key=lambda r: r['src'])
        atomic_json(provenance_path, provenance)
    print(f'Applied {len(outputs)} speech clips. Preserved {len(plan["clips"]) - len(outputs)} phoneme/blend assets. Listening approval still required.', flush=True)

if __name__ == '__main__':
    main()
