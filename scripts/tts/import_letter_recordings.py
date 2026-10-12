"""Import user-recorded a-z names/sounds and rebuild dependent audio offline.
Input manifest contains confirmed alphabet order, source hashes and trim times.
Human origin is not equivalent to pronunciation approval. No voice cloning.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from elevenlabs_generate import ROOT, RATE, digest, decode, signature


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--recordings', type=Path, required=True)
    parser.add_argument('--cache', type=Path, default=Path('/workspace/.leesavontuur-tools/elevenlabs-jessica'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    entries = json.loads(args.recordings.read_text())
    source_root = args.recordings.parent
    plan = json.loads((ROOT / 'docs/audio/speech-plan.json').read_text())
    provenance_path = ROOT / 'public/audio/provenance.json'
    provenance = json.loads(provenance_path.read_text())
    records = {r['src']: r for r in provenance['clips']}
    clips = {c['src']: c for c in plan['clips']}
    alphabet = set('abcdefghijklmnopqrstuvwxyz')
    imported, details = {}, {}
    for entry in entries:
        kind = 'name' if entry['file'].startswith('abc/') else 'sound'
        gid = entry.get('letter', entry.get('tentativeLetter'))
        if gid not in alphabet:
            raise ValueError('Only confirmed a-z recordings may be imported')
        src = f'audio/graphemes/{gid}_{kind}.mp3'
        if src in imported:
            raise ValueError('Duplicate letter recording')
        data = (source_root / entry['file']).read_bytes()
        if digest(data) != entry['sha256']:
            raise ValueError('Recording checksum mismatch')
        imported[src] = data
        details[src] = {k:entry[k] for k in ('source','sourceSha256','startSeconds','endSeconds','processing')}
    expected = {f'audio/graphemes/{g}_{k}.mp3' for g in alphabet for k in ('name','sound')}
    if set(imported) != expected:
        raise ValueError('Exactly 26 names and 26 sounds are required')
    approved = {r['src'] for r in json.loads((ROOT / 'docs/audio/review.json').read_text()) if r.get('approved')}
    buffers = {src:decode(source_root / entry['file']) for entry in entries for src in [f"audio/graphemes/{entry.get('letter',entry.get('tentativeLetter'))}_{'name' if entry['file'].startswith('abc/') else 'sound'}.mp3"]}
    changed = set(imported)
    compositions = {}
    speech_cache = {}
    ledger = json.loads((args.cache / 'ledger.json').read_text())

    def get(src):
        if src not in buffers:
            buffers[src] = decode(ROOT / 'public' / src)
        return buffers[src]

    def joined(parts):
        gap = np.zeros(round(RATE * .25), dtype=np.float32)
        return np.concatenate([p for i, part in enumerate(parts) for p in ([gap, part] if i else [part])])

    for word in plan['words']:
        src = f"audio/blends/{word['word']}.mp3"
        if src not in clips:
            continue
        sources = [f'audio/graphemes/{g}_sound.mp3' for g in word['graphemes']]
        if not any(s in imported for s in sources):
            continue
        buffers[src] = joined([get(s) for s in sources])
        origin = 'human-recording' if all(s in imported for s in sources) else 'synthetic-draft'
        compositions[src] = {'origin':origin, 'parts':[{'existing':s} for s in sources], 'method':'segmented-recordings-250ms-pauses'}
        changed.add(src)
    for src, record in records.items():
        if src in changed or not record.get('parts'):
            continue
        parts = [dict(p) for p in record['parts']]
        gid = record['key'].removeprefix('instr.lk.intro.') if record['key'].startswith('instr.lk.intro.') else None
        if gid in alphabet:
            parts[1] = {'existing':f'audio/graphemes/{gid}_name.mp3'}
        if not any(p.get('existing') in changed for p in parts):
            continue
        samples = []
        for part in parts:
            if 'existing' in part:
                samples.append(get(part['existing']))
            else:
                key = signature(part)
                if key not in speech_cache:
                    path = args.cache / (key + '.mp3')
                    if ledger['requests'].get(key,{}).get('sha256') != digest(path.read_bytes()):
                        raise ValueError('Unverified speech cache')
                    speech_cache[key] = decode(path)
                samples.append(speech_cache[key])
        buffers[src] = joined(samples)
        compositions[src] = {'origin':'synthetic-draft', 'parts':parts, 'method':'jessica-with-user-recorded-letters'}
        changed.add(src)
    for src in changed:
        if src in approved or records[src]['sha256'] != digest((ROOT / 'public' / src).read_bytes()):
            raise ValueError(f'Protected or changed audio: {src}')
    print(json.dumps({'directRecordings':len(imported),'rebuiltCompositions':len(compositions),'totalChanged':len(changed),'apply':args.apply}),flush=True)
    if not args.apply:
        return
    with tempfile.TemporaryDirectory() as temporary:
        def render(src):
            target = Path(temporary) / src
            target.parent.mkdir(parents=True, exist_ok=True)
            if src in imported:
                target.write_bytes(imported[src])
                extra = {'origin':'human-recording','method':'trimmed-user-recording','sourceRecording':details[src], 'voice':'User-provided Dutch recording'}
            else:
                samples = buffers[src].copy()
                rms = float(np.sqrt(np.mean(samples ** 2)))
                samples *= min(.07 / max(rms,.00001), .60 / float(np.max(np.abs(samples))))
                subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','1','-i','pipe:0','-b:a','128k',str(target)],input=samples.astype('<f4').tobytes(),check=True)
                extra = dict(compositions[src], voice='User recordings' if compositions[src]['origin']=='human-recording' else 'Synthetic speech with user-recorded letters')
            clip = clips[src]
            record = {k:clip[k] for k in ('key','src','text')}
            record.update(extra, reviewed=False, sha256=digest(target.read_bytes()), durationSeconds=round(len(decode(target))/RATE,3))
            return src,target,record
        with ThreadPoolExecutor(max_workers=4) as pool:
            staged = list(pool.map(render, sorted(changed)))
        for src,target,record in staged:
            (ROOT / 'public' / src).write_bytes(target.read_bytes())
            records[src] = record
        provenance['clips'] = sorted(records.values(),key=lambda r:r['src'])
        provenance['generator'] = 'User-recorded a-z names and sounds; Jessica instructions; retained synthetic letter combinations. Per-file sources below.'
        provenance_path.write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n')
    print('Imported without marking pronunciation approved.',flush=True)

if __name__ == '__main__':
    main()
