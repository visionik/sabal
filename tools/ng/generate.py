#!/usr/bin/env python3
"""Generate next-gen pictures for one game with Codex's image tool.

usage: generate.py <game> <raw-dir> [--jobs N] [--batch N] [--only room-4,item-29]

Reads ng/style.json and ng/<game>/prompts.json, and asks `codex exec` to
generate each missing picture into <raw-dir>/<game>/ as room-<n>.png or
item-<n>.png (full size, before process.py crops and shrinks them).
"""
import json, os, subprocess, sys, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    args = sys.argv[1:]
    game, raw = args[0], args[1]
    jobs = int(args[args.index('--jobs') + 1]) if '--jobs' in args else 3
    batch = int(args[args.index('--batch') + 1]) if '--batch' in args else 3
    only = set(args[args.index('--only') + 1].split(',')) if '--only' in args else None
    style = json.load(open(os.path.join(ROOT, 'ng', 'style.json')))
    prompts = json.load(open(os.path.join(ROOT, 'ng', game, 'prompts.json')))
    out = os.path.join(raw, game)
    os.makedirs(out, exist_ok=True)
    todo = []
    for kind in ('rooms', 'items'):
        for n, text in prompts.get(kind, {}).items():
            name = f"{kind[:-1]}-{n}"
            if only and name not in only: continue
            if only is None and os.path.exists(os.path.join(out, name + '.png')): continue
            todo.append((name, kind, text))
    batches = [todo[i:i + batch] for i in range(0, len(todo), batch)]
    print(f'{len(todo)} pictures in {len(batches)} batches', flush=True)

    def run(group):
        lines = []
        for name, kind, text in group:
            orient = 'landscape (wide)' if kind == 'rooms' else 'portrait or square, whichever fits the object'
            lines.append(f"- {name}.png ({orient}): {style[kind[:-1]]} Subject: {text}")
        prompt = (
            f"Use your image generation tool to create {len(group)} separate images for the adventure game "
            f"'{prompts['game']}' and save each one as a PNG file in the current directory with exactly the file name given. "
            "Generate each image; do not write code to draw them, and do not edit or combine them. "
            "Images described as having a transparent background must be saved with a real alpha channel.\n\n"
            + "\n".join(lines) + "\n\nWhen done, list the saved file names."
        )
        r = subprocess.run(['npx', '-y', '@openai/codex', 'exec', '--skip-git-repo-check', '-s', 'workspace-write',
                            '-C', out, prompt], stdin=subprocess.DEVNULL, capture_output=True, text=True)
        made = [n for n, _, _ in group if os.path.exists(os.path.join(out, n + '.png'))]
        missing = [n for n, _, _ in group if n not in made]
        print(f"done {made}" + (f" MISSING {missing} (exit {r.returncode}: {r.stderr.strip()[-300:]})" if missing else ''), flush=True)

    with cf.ThreadPoolExecutor(jobs) as pool:
        list(pool.map(run, batches))

if __name__ == '__main__':
    main()
