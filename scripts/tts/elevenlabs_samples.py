"""Create small Dutch voice auditions; never overwrites production audio.
Uses a securely configured API key and the user's selected voice.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request

SAMPLES = [
    ('instructie', 'We gaan samen lezen! Luister rustig naar de knoppen. Welke klank hoort bij deze letter?', .5, .15, .90),
    ('complimenten-rustig', 'Goed gedaan! Ja, dat klopt! Kijk eens, het is gelukt! Je hebt goed geluisterd. Op naar de volgende!', .5, .2, .95),
    ('complimenten-levendig', 'Goed gedaan! Ja, dat klopt! Kijk eens, het is gelukt! Je hebt goed geluisterd. Op naar de volgende!', .35, .5, .98),
    ('uitspraak', 'kat. tas. hut. huis. geit. neus. vis. kaas. Probeer het nog eens. Neem maar rustig de tijd.', .5, .1, .90),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--voice', default='JoZAnrliG62q9Iogun7f')
    parser.add_argument('--output', type=Path, default=Path('/tmp/leesavontuur-elevenlabs-stemproeven'))
    parser.add_argument('--plan', action='store_true')
    args = parser.parse_args()
    if args.plan:
        print(json.dumps({'voice': args.voice, 'model': 'eleven_multilingual_v2', 'textCharacters': sum(len(s[1]) for s in SAMPLES), 'samples': [{'kind': s[0], 'text': s[1]} for s in SAMPLES]}, ensure_ascii=False, indent=2))
        return
    if not re.fullmatch(r'[A-Za-z0-9_-]{10,80}', args.voice):
        raise SystemExit('Invalid voice ID.')
    key = os.environ.get('LEESAVONTUUR_ELEVENLABS_KEY')
    if not key:
        raise SystemExit('Configure LEESAVONTUUR_ELEVENLABS_KEY in the secure environment settings.')
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **kw):
            return None
    client = urllib.request.build_opener(NoRedirect())
    def request(path, data=None):
        req = urllib.request.Request('https://api.elevenlabs.io' + path,
            data=json.dumps(data).encode() if data is not None else None,
            headers={'xi-api-key': key, 'Content-Type': 'application/json'})
        try:
            with client.open(req, timeout=90) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            # Show only a bounded error identifier, never raw request/response data.
            status = ''
            try:
                detail = json.loads(exc.read()).get('detail', {})
                candidate = detail.get('status', '') if isinstance(detail, dict) else ''
                if isinstance(candidate, str) and re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', candidate):
                    status = candidate
            except (ValueError, AttributeError):
                pass
            raise SystemExit(f'ElevenLabs HTTP {exc.code} {status}. Check API permissions, voice access and available credits. No automatic retries.') from None
        except urllib.error.URLError:
            raise SystemExit('ElevenLabs connection failed; check the allowed API destination.') from None
    voice = json.loads(request('/v1/voices/' + args.voice))
    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / 'samples.json'
    rows = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
    for kind, text, stability, style, speed in SAMPLES:
        target = args.output / f'{kind}.mp3'
        body = {'text': text, 'model_id': 'eleven_multilingual_v2', 'language_code': 'nl',
            'voice_settings': {'stability': stability, 'similarity_boost': .75, 'style': style, 'speed': speed, 'use_speaker_boost': True}}
        signature = hashlib.sha256(json.dumps({'voice': args.voice, 'body': body}, sort_keys=True).encode()).hexdigest()
        if target.exists():
            previous = next((r for r in rows if r['file'] == target.name), None)
            if previous and previous['requestSha256'] == signature and previous['sha256'] == hashlib.sha256(target.read_bytes()).hexdigest():
                continue
            raise SystemExit(f'Existing sample differs: {target.name}; choose a new output folder.')
        data = request('/v1/text-to-speech/' + args.voice + '?output_format=mp3_44100_128', body)
        temporary = target.with_suffix('.part.mp3')
        temporary.write_bytes(data)
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(temporary), '-f', 'null', '-'], check=True)
        temporary.replace(target)
        rows.append({'voiceId': args.voice, 'voiceName': voice.get('name'), 'kind': kind,
            'text': text, 'file': target.name, 'settings': body['voice_settings'], 'model': body['model_id'],
            'requestSha256': signature, 'sha256': hashlib.sha256(data).hexdigest(), 'reviewed': False})
        manifest_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
        print(f'Generated {target.name}', flush=True)
    print('Voice samples ready for listening; production files unchanged.')

if __name__ == '__main__':
    main()
