"""Проверка: каждая шутка в src/transom-falls.html после применения операций даёт заявленный результат."""
import re, sys, pathlib
src = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'transom-falls.html'
s = src.read_text(encoding='utf-8')
defined = set(re.findall(r"'(.>.)': \[\[", s))
bad = 0
for lang, t, r, ops in re.findall(r"\{ lang:'(\w+)', text:'([^']+)', result:'([^']+)', ops:\[(.*?)\]", s):
    chars, drop, brk = list(t), set(), {}
    for i, k, key in re.findall(r"i:(\d+),(fall|brk)(?::'(.>.)')?", ops):
        i = int(i)
        if k == 'fall': drop.add(i)
        else: brk[i] = key
    out = ''.join((brk[i].split('>')[1] if i in brk else c) for i, c in enumerate(chars) if i not in drop)
    ok = ' '.join(out.split()) == r and all(chars[i] == key[0] and key in defined for i, key in brk.items())
    bad += not ok
    print(('OK ' if ok else 'BAD'), lang, t, '->', out)
sys.exit(1 if bad else 0)
