import itertools, wordfreq, json
words = [w for w in wordfreq.top_n_list('en', 60000) if w.isalpha() and w.isascii()]
freq = {w: wordfreq.zipf_frequency(w, 'en') for w in words}
vocab = set(words)
# failure / trouble targets (hand-curated, broad on purpose)
NEG = set("""
bad sad mad dead dud dust debt doom dire dim dumb fail flop flat fall fell lost lose loss low lag late lame lazy leak lie
mess miss mist moan mope mud nil nope null void zero none nothing nobody naught gone gloom grim grief gap
rot rust ruin rip rift rash rot sink sank sunk slow slump stuck stall stale sore sour sick sigh sob slip
toy trap tank tear torn trip trouble tired thin trash
bug bugs bust bum bore bored boring broke broken bomb burn burnt bleak blah blame blank blind blunder
crash crap cry cost costs crack crude creep cringe curse
fake fear foe fog fool fret fuss flaw fade fired fizz fumble
hurt hole hell hiss hollow hang hard harm hate
ill idle itch
junk jam
kill knot
lunch lonely lack lax leaky lurk limp
mute myth meh mock moot mold
nag nit numb
oops odd ouch
pain pale pest pit panic plain poor pity puke
quit
rage raw rat rant rent rust
scam scar sham shy silly smog snag spam spill spent stink stop strain stress struggle sulk sweat
tax tomb toil torment tragic trick
ugly upset
vain vent vex
waste weak weep wet woe worry worse worst wreck wrong wail wasted
yawn yuck
ash gloom sunk solo alone poorly unpaid unsold unread unseen unknown zilch
""".split())
NEG &= vocab | NEG
def dels2(w):
    out = set()
    n = len(w)
    for i, j in itertools.combinations(range(n), 2):
        r = w[:i] + w[i+1:j] + w[j+1:]
        out.add((r, i, j))
    return out
res = []
for w in words:
    if not (5 <= len(w) <= 10): continue
    for r, i, j in dels2(w):
        if r in NEG and r != w:
            res.append((w, r, w[i]+w[j], i, j, j == i+1, freq[w]))
# dedupe by (w, r)
seen = {}
for t in res:
    k = (t[0], t[1])
    if k not in seen or (t[5] and not seen[k][5]): seen[k] = t
res = sorted(seen.values(), key=lambda t: -t[6])
json.dump(res, open('/tmp/pairs.json','w'))
print(len(res))
for t in res[:400]:
    w, r, rem, i, j, adj, f = t
    tag = 'prefix' if (i, j) == (0, 1) else ('suffix' if j == len(w)-1 and adj else ('adj' if adj else ''))
    print(f"{w:12} -> {r:9} drop '{rem}' {tag:7} z={f:.1f}")
