#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prepare the static website for a GitHub Pages project or custom domain."""
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import os
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_ORIGIN = 'https://fishdreams-sakhalin.resplendentclay5.chatgpt.site'
ATTR = re.compile(r'''((?:href|src|action|poster)\s*=\s*["'])(/(?!/)[^"']*)(["'])''', re.I)
CSS_URL = re.compile(r'''url\((["']?)(/(?!/)[^)"']*)\1\)''')
TEXT_EXTENSIONS = {'.html', '.css', '.js', '.json', '.xml', '.txt', '.svg'}


def prepare(base_url, output):
    base_url = base_url.rstrip('/')
    parsed = urlsplit(base_url)
    if parsed.scheme not in ('https', 'http') or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError('Provide a complete Pages URL without a query or fragment.')
    base_path = parsed.path.rstrip('/')
    source = ROOT / 'site'
    output = Path(output).resolve()
    if output == source or source in output.parents or output in source.parents:
        raise ValueError('Output must be separate from the source site folder.')
    output.mkdir(parents=True, exist_ok=True)
    count = 0
    for path in source.rglob('*'):
        if not path.is_file():
            continue
        target = output / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix in TEXT_EXTENSIONS:
            text = path.read_text(encoding='utf-8').replace(ORIGINAL_ORIGIN, base_url)
            text = ATTR.sub(lambda m: m[1] + base_path + m[2] + m[3], text)
            text = CSS_URL.sub(lambda m: 'url(' + m[1] + base_path + m[2] + m[1] + ')', text)
            target.write_text(text, encoding='utf-8')
        else:
            shutil.copy2(path, target)
        count += 1
    (output / '.nojekyll').touch()
    print(f'Prepared {count} files for {base_url}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default=os.environ.get('PAGES_BASE_URL', ''))
    parser.add_argument('--output', type=Path, default=ROOT / '_site')
    args = parser.parse_args()
    prepare(args.base_url, args.output)
