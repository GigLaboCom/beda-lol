import itertools, wordfreq
words = [w for w in wordfreq.top_n_list('en', 150000) if w.isalpha() and w.isascii()]
fz = {w: wordfreq.zipf_frequency(w, 'en') for w in words}
vocab = set(words)
# Какую букву можно получить из другой, если отломать кусок (заглавные, гротеск/антиква).
# Только «вычитание»: у результата все штрихи уже есть в исходной букве.
BREAK = {
 'e': ['f', 'l'],          # отпала нижняя / верхняя+средняя перекладины
 'b': ['p'],               # отпала нижняя чаша
 'r': ['p'],               # отпала ножка
 'o': ['c'],               # отпал правый кусок дуги
 'q': ['o'],               # отпал хвостик
 'g': ['c'],               # отпала шпора
 'w': ['v'],               # отпала половина
 'y': ['v'],               # отпала ножка
 'm': ['n'],               # отпала последняя палка (с натяжкой)
 'h': ['n'],               # отпала… нет, H→N не вычитание
 'd': ['c'],               # отпала вертикаль? (D→C с натяжкой в антикве)
 'p': ['f'],               # нет — P→F не вычитание
}
BREAK.pop('h'); BREAK.pop('p'); BREAK.pop('d')
NEG = set("""oof ugh meh nah nope rip boo bleh blah eek ick ouch oops sigh sob lol cringe yawn
sos sunk sank sink sinks leak leaks hole holes wreck adrift aground ashore drift drown bilge rust rusty rot rotten stuck
fail failed flop dud bust busted broke broken bomb crash tank stall dead dies died doom ruin lost lose loss lag late lame
gone nil null void zero none nothing empty blank sad mad bad woe dire grim gloom glum blue sore sour sick ill tired bored
boring dull stale numb lonely alone debt owe owed poor cost costs tax bills toy toys pest pain panic cold coal crow cheap
fake flaw fear foe fog fool fret fuss scam spam trap trick trash junk lurk limp idle vain vent weak worse worst wrong waste
lack lax low slow sloth fell fall flat fizzle flub goof gaffe glitch bug bugs bore mess miss mist mud mute myth mock moan
nag pale pit pity plain rage rant rat raw scar shy sham snag spill strain stress sulk sweat tear torn trip ugly upset wet
cry curse crap crack crude creep dim dumb dust fade fired hurt hate harm hang hard hell lie lies loner flop""".split())
def variants(w, max_ops=2):
    # операции: отломать кусок буквы (BREAK) или уронить букву целиком
    out = {}
    n = len(w)
    ops = []
    for i, c in enumerate(w):
        for t in BREAK.get(c, []): ops.append(('break', i, t))
        ops.append(('drop', i, None))
    for k in range(1, max_ops + 1):
        for combo in itertools.combinations(ops, k):
            idxs = [o[1] for o in combo]
            if len(set(idxs)) < k: continue
            if not any(o[0] == 'break' for o in combo): continue   # хотя бы один «надлом»
            chars = list(w); desc = []
            for kind, i, t in combo:
                if kind == 'break': desc.append(f"{w[i].upper()}→{t.upper()}"); chars[i] = t
                else: desc.append(f"−{w[i].upper()}"); chars[i] = ''
            r = ''.join(chars)
            if r and r != w: out.setdefault(r, []).append(' '.join(desc))
    return out
rows = []
for w in words:
    if not (3 <= len(w) <= 10) or fz[w] < 3.2: continue
    for r, descs in variants(w).items():
        if r in NEG:
            nb = min(d.count('→') + d.count('−') for d in descs)
            rows.append((r, w, sorted(descs, key=len)[0], nb, fz[w]))
rows.sort(key=lambda t: (t[3], -t[4]))
print(f"{len(rows)} hits\n")
print("== ОДИН надлом (только кусок одной буквы) ==")
for r, w, d, nb, f in rows:
    if nb == 1: print(f"  {w.upper():10} → {r.upper():8} [{d}]  z={f:.1f}")
print("\n== ДВА отпадания (надлом + надлом, или надлом + целая буква) ==")
for r, w, d, nb, f in rows:
    if nb == 2 and f >= 3.6: print(f"  {w.upper():10} → {r.upper():8} [{d}]  z={f:.1f}")
