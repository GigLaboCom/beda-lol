import itertools, wordfreq
V = set(w for w in wordfreq.top_n_list('en', 150000) if w.isalpha() and w.isascii())
fz = lambda w: wordfreq.zipf_frequency(w, 'en')
BREAK = {'e':['f','l'],'b':['p'],'r':['p'],'o':['c'],'q':['o'],'g':['c'],'w':['v']}
# Провал проекта / продукта / запуска (что должно остаться на транце)
FAIL = set("""fail failed fails flop flops dud bust busted broke broken bomb bombed crash crashed crashes tank tanked stall stalled
dead died dies doom doomed ruin ruined lost lose loss losses lag late lame gone nil null void zero none nope nobody empty blank
debt owe owed cost costs burn burnt burned rust rot rotten sunk sink sank leak leaks bug bugs junk spam scam fake trash crap
oof oops ugh meh blah nah sad bad woe sore sick ill idle stuck stale dull flat fell fall slow low cheap cold push pest pain pit
coal creep scar toy pet pets lurk limp loner alone quit churn churned pivot delay delayed down outage glitch error oops unpaid
unsold unused unseen nothing sigh""".split())
FAIL &= V | FAIL
# Тематические «победы»: запуск, продукт, рост, стартап, деньги, разработка
SRC = """launch launched launches launching release released ship shipped shipping deploy deployed product products feature features
startup founder founders venture ventures growth grow growing scale scaling boost booster traction momentum demand market marketing
brand branding buzz hype viral trending users user signup signups revenue profit profits money funding funded invest investor
investors series seed pitch pitched demo roadmap beta alpha release sprint build builder built code coder commit merge rollout
success successful win winner winning wins best better bright brave bold big great grand glory golden gold goal goals rich reward
rise rising soar rocket boom bloom breakthrough milestone unicorn exit acquired ipo premium pro prime proof proven power powered
dream dreamer vision visionary idea ideas genius hero legend star stardom fame famous fortune treasure jackpot bonus prize award
crown champion leader leading lead future forward onward upward ahead first launchpad liftoff takeoff orbit rover robust stable
solid strong strength smart clever wow wonder epic massive bestseller blockbuster hit smash cool fresh brilliant""".split()
PHRASES = """gold rush best bet big launch big win big bet big boost go live product hunt demo day pitch deck growth hack hockey stick
home run big deal big break ship it launch day launch week grand opening new release big release early access beta launch
series a seed round big money big exit hot product hot startup rocket ship moon shot moonshot big bang bright idea great idea
big idea big dream dream team star product golden goose cash cow gold mine big profit real growth boom time peak growth
viral growth user growth fast growth big growth gold star top spot win big best product best launch""".split('\n')
PHRASES = [p.strip() for line in PHRASES for p in [line]]
PH = []
for line in """gold rush|best bet|big launch|big win|big bet|big boost|go live|product hunt|demo day|pitch deck|growth hack|hockey stick|home run|big deal|big break|ship it|launch day|launch week|grand opening|new release|big release|early access|beta launch|series a|seed round|big money|big exit|hot product|hot startup|rocket ship|moon shot|big bang|bright idea|great idea|big idea|big dream|dream team|star product|golden goose|cash cow|gold mine|big profit|real growth|boom time|peak growth|viral growth|user growth|fast growth|big growth|gold star|top spot|win big|best product|best launch|good launch|great launch|big bucks|free money|smart money|big crowd|big buzz|big hype|rich reward|bold move|big move|sure bet|safe bet|best seller|big seller|big hit|smash hit|big splash|grand prize|top prize|gold medal|golden age|golden boy|big brand|brand power|star power|power move|growth rocket|proof point|sold out|big order|big orders|record sales|big sales|best sales""".split('|'):
    PH.append(line.split())
def token_variants(w, max_ops):
    # dict: result -> (ops, description)
    out = {w: (0, '')}
    ops = []
    for i, c in enumerate(w):
        for t in BREAK.get(c, []): ops.append(('b', i, t))
        ops.append(('d', i, None))
    for k in range(1, max_ops + 1):
        for combo in itertools.combinations(ops, k):
            if len({o[1] for o in combo}) < k: continue
            chars = list(w); desc = []
            for kind, i, t in combo:
                if kind == 'b': chars[i] = t; desc.append(f"{w[i].upper()}→{t.upper()}")
                else: chars[i] = ''; desc.append(f"−{w[i].upper()}")
            r = ''.join(chars)
            if r and (r not in out or out[r][0] > k): out[r] = (k, ' '.join(desc))
    return out
results = []
# single words: at least 2 falls, result must be a failure word
for w in SRC:
    for r, (k, d) in token_variants(w, 3).items():
        if k >= 2 and r in FAIL:
            parts = d.count('→')
            results.append(('word', w.upper(), r.upper(), k, parts, d))
# phrases: each token may change or stay; total falls >= 2; every token a real word; >=1 failure token
for toks in PH:
    per = [token_variants(t, 2) for t in toks]
    for combo in itertools.product(*[list(p.items()) for p in per]):
        total = sum(v[1][0] for v in combo)
        if total < 2 or total > 3: continue
        res = [v[0] for v in combo]
        if not all(r in V or r in FAIL for r in res): continue
        nfail = sum(r in FAIL for r in res)
        if nfail == 0: continue
        d = '; '.join(v[1][1] for v in combo if v[1][1])
        parts = d.count('→')
        results.append(('phrase', ' '.join(toks).upper(), ' '.join(res).upper(), total, parts, d, nfail))
seen = set(); words = []; phrases = []
for r in results:
    key = (r[1], r[2])
    if key in seen: continue
    seen.add(key)
    (words if r[0] == 'word' else phrases).append(r)
print("== СЛОВА: минимум два падения, итог — провал ==")
for _, a, b, k, p, d in sorted(words, key=lambda t: (t[3], -t[4], t[1])):
    print(f"  {a:12} → {b:8} [{d}]  ({k} пад., из них надломов {p})")
print("\n== ВЫРАЖЕНИЯ: минимум два падения, итог — провал ==")
for r in sorted(phrases, key=lambda t: (-t[6], t[3], -t[4], t[1])):
    _, a, b, k, p, d, nf = r
    print(f"  {a:16} → {b:16} [{d}]  ({k} пад., надломов {p}, провальных слов {nf})")
