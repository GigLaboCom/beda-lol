import itertools, wordfreq
words = [w for w in wordfreq.top_n_list('en', 150000) if w.isalpha() and w.isascii()]
fz = {w: wordfreq.zipf_frequency(w,'en') for w in words}
# failure targets grouped so we can read them by flavour
GROUPS = {
 'slang':   "oof ugh meh nah nope yikes doh rip boo bleh blah pfft eek ick ouch oops welp sigh sob fml smh lol cringe yawn",
 'nautical':"sos sunk sank sink sinks leak leaks hole holes wreck wrecked adrift aground ashore drift drifting drown drowned bilge rust rusty rot rotten mayday overboard capsize founder foundered stuck stranded barnacle",
 'fail':    "fail failed flop flops dud bust busted broke broken bomb bombed crash crashed tank tanked stall stalled dead dies died doom doomed ruin ruined lost lose loss lag late lame gone nil null void zero none nothing nobody naught empty blank",
 'mood':    "sad mad bad woe dire grim gloom glum blue sore sour sick ill tired bored boring dull stale meh numb lonely alone",
 'money':   "debt broke owe owed poor cost costs loss losses tax bills",
 'toy':     "toy toys hobby",
}
NEG = {w: g for g, s in GROUPS.items() for w in s.split()}
res = []
for w in words:
    if not (4 <= len(w) <= 12) or fz[w] < 2.8: continue
    for i, j in itertools.combinations(range(len(w)), 2):
        r = w[:i] + w[i+1:j] + w[j+1:]
        if r in NEG:
            res.append((NEG[r], r, w, w[i]+w[j], (i, j), fz[w]))
best = {}
for g, r, w, rem, idx, f in res:
    k = (w, r)
    if k not in best: best[k] = (g, r, w, rem, idx, f)
by = {}
for v in best.values(): by.setdefault(v[0], []).append(v)
for g in GROUPS:
    L = sorted(by.get(g, []), key=lambda t: (t[1], -t[5]))
    print(f"== {g} ==")
    cur = None; line = []
    for gg, r, w, rem, idx, f in L:
        if r != cur:
            if line: print(f"  {cur.upper():9} <- " + ", ".join(line[:14]))
            cur, line = r, []
        pos = 'pre' if idx == (0,1) else ('suf' if idx == (len(w)-2, len(w)-1) else ('+' if idx[1] == idx[0]+1 else '~'))
        line.append(f"{w.upper()}[-{rem.upper()}{pos}]")
    if line: print(f"  {cur.upper():9} <- " + ", ".join(line[:14]))
