#!/usr/bin/env python3
"""Weekly official Australian guideline-page change detection. Never automatically edit exam answers."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json, os, re, sys, urllib.request

BASE = Path(__file__).resolve().parent.parent

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript', 'svg'):
            self.hidden += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg'):
            self.hidden = max(0, self.hidden-1)
    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.parts.append(data.strip())

def digest_for(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'SPAW-Study-Garden-Guideline-Watch/1.0', 'Accept': 'text/html'})
    with urllib.request.urlopen(request, timeout=25) as response:
        if 'html' not in response.headers.get('Content-Type', '').lower():
            raise ValueError('This guideline response is not HTML')
        data = response.read(1500000).decode('utf-8', 'replace')
    parser = TextParser()
    parser.feed(data)
    visible = re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip().lower()
    if len(visible) < 600:
        raise ValueError('Web content too short to compare reliably')
    return hashlib.sha256(visible.encode('utf-8')).hexdigest()

def flag_for_review(source, old, new):
    repo = os.environ.get('GITHUB_REPOSITORY')
    token = os.environ.get('GITHUB_TOKEN')
    if not repo or not token:
        raise ValueError('Missing GitHub issue credentials')
    summary = (
        "An automated weekly check detected a change in an Australian clinical guideline page.\n\n"
        f"Official source: {source['url']}\n"
        f"Topics: {source['focus']}\n\n"
        "This can also be a website-layout change. A reviewer must read the actual "
        "guideline/revision date and compare affected SPA-W question statements, "
        "medication choices, answer keys and treatment rationales before updating. "
        "Do NOT automatically edit medical answers or students' progress.\n\n"
        f"Old fingerprint: {old}\nNew fingerprint: {new}"
    )
    body = json.dumps({'title': '[Guideline review] ' + source['name'] + ' changed', 'body': summary}).encode('utf-8')
    req = urllib.request.Request(
        f'https://api.github.com/repos/{repo}/issues',
        data=body,
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': 'application/vnd.github+json',
                 'Content-Type': 'application/json',
                 'User-Agent': 'SPAW-Guideline-Watch'},
        method='POST')
    with urllib.request.urlopen(req, timeout=25) as response:
        result = json.load(response)
    print('Opened review issue:', result.get('html_url'))

def main():
    sources = json.loads((BASE / 'guideline-sources.json').read_text(encoding='utf-8'))
    state_file = BASE / 'guideline-watch-state.json'
    old = json.loads(state_file.read_text(encoding='utf-8')) if state_file.exists() else {}
    new = old.copy()
    checked = 0
    alerts = 0
    for source in sources:
        key = source['id']
        try:
            digest = digest_for(source['url'])
        except Exception as exc:
            print(f'WARNING: {key} unavailable, retaining old fingerprint: {exc}', file=sys.stderr)
            continue
        checked += 1
        if key not in old:
            new[key] = digest
            print('Created baseline:', key)
        elif old[key] != digest:
            flag_for_review(source, old[key], digest)
            new[key] = digest
            alerts += 1
        else:
            print('No visible change:', key)
    if checked == 0:
        raise SystemExit('No official guidance page accessible; no baseline updated')
    if old != new:
        state_file.write_text(json.dumps(new, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'Checked {checked}/{len(sources)} official pages; flagged {alerts}; edited zero clinical questions')

if __name__ == '__main__':
    main()
