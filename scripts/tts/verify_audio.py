"""Check every synthetic asset's identity, decodability and non-silent signal.
This verifies technical integrity, never pronunciation or human approval.
"""
from concurrent.futures import ThreadPoolExecutor
import array
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
entries = json.loads((root / 'public/audio/provenance.json').read_text())['clips']
def check(entry):
    path = root / 'public' / entry['src']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], entry['src']
    decoded = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(path), '-ar', '16000', '-ac', '1', '-f', 'f32le', '-'])
    samples = array.array('f')
    samples.frombytes(decoded)
    assert len(samples) > 800, entry['src']
    peak = max(abs(sample) for sample in samples)
    assert .005 < peak < 1.0, (entry['src'], peak)
    duration = len(samples) / 16000
    assert abs(duration - entry['durationSeconds']) < .2, (entry['src'], duration)
    assert entry['origin'] == 'synthetic-draft' and entry['reviewed'] is False
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(check, entries))
print(f'PASS: {len(entries)} checksums, full MP3 decodes, durations and non-silent signals. No pronunciation approval implied.')
