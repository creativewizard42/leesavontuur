"""Produce explicitly synthetic Dutch drafts; never synthesize teaching phonemes.
Usage: python scripts/tts/generate_drafts.py --model-dir /path/to/voice
Run npm run audio:catalog first. See docs/AUDIO_PRODUCTION.md for provenance.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import sherpa_onnx
import soundfile as sf

parser = argparse.ArgumentParser()
parser.add_argument('--model-dir', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
model = args.model_dir
config = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(model / 'nl_NL-ronnie-medium.onnx'),
            tokens=str(model / 'tokens.txt'),
            data_dir=str(model / 'espeak-ng-data'),
        ), num_threads=2, provider='cpu', debug=False,
    ), max_num_sentences=1,
)
if not config.validate():
    raise SystemExit('Invalid model configuration')
tts = sherpa_onnx.OfflineTts(config)
entries = json.loads((root / 'docs/audio/recording-script.json').read_text())
provenance_path = root / 'public/audio/provenance.json'
previous = json.loads(provenance_path.read_text()) if provenance_path.exists() else {'clips': []}
known = {entry['src']: entry for entry in previous['clips']}
records = dict(known)
by_text = {}
with tempfile.TemporaryDirectory() as tmp:
    for index, entry in enumerate(entries):
        if entry['delivery'] != 'speech' or not entry.get('text') or '{' in entry['text']:
            continue
        target = root / 'public' / entry['src']
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            # Never overwrite human files or previously generated clips.
            continue
        text = entry['text']
        if text in by_text:
            shutil.copyfile(by_text[text], target)
        else:
            audio = tts.generate(text, sid=0, speed=0.92)
            if len(audio.samples) == 0:
                raise RuntimeError(f'Empty audio: {entry["key"]}')
            wav = Path(tmp) / 'speech.wav'
            sf.write(str(wav), audio.samples, audio.sample_rate)
            subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                '-i', str(wav), '-af', 'loudnorm=I=-20:TP=-2:LRA=7', '-ar', '44100', '-ac', '1',
                '-codec:a', 'libmp3lame', '-b:a', '96k', str(target)], check=True)
            by_text[text] = target
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
            'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(target)]))
        if not 0.05 < duration < 60:
            raise RuntimeError(f'Invalid duration: {entry["key"]}')
        records[entry['src']] = {'key': entry['key'], 'src': entry['src'], 'text': text,
            'origin': 'synthetic-draft', 'voice': 'Piper nl_NL-ronnie-medium',
            'reviewed': False, 'sha256': digest, 'durationSeconds': round(duration, 3)}
        # Persist progress so interruption does not leave unidentified assets.
        provenance_path.write_text(json.dumps({'schemaVersion': 1,
            'generator': 'sherpa-onnx 1.12.36; Piper nl_NL-ronnie-medium; speed 0.92',
            'modelSource': 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-nl_NL-ronnie-medium.tar.bz2',
            'datasetLicense': 'CC0 (bundled MODEL_CARD)',
            'clips': sorted(records.values(), key=lambda x: x['src'])}, indent=2, ensure_ascii=False) + '\n')
        if len(records) % 50 == 0:
            print(f'{len(records)} synthetic draft clips generated', flush=True)
print(f'Finished: {len(records)} synthetic clips. Human phonemes remain required.', flush=True)
