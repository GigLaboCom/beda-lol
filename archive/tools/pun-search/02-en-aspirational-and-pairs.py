import itertools, wordfreq
words = [w for w in wordfreq.top_n_list('en', 120000) if w.isalpha() and w.isascii()]
vocab = set(words); fz = lambda w: wordfreq.zipf_frequency(w,'en')
NEG = set("""bad sad mad dead dud dust debt doom dire dim dumb fail flop flat fall fell lost lose loss low lag late lame lazy leak lie
mess miss mist moan mope mud nil nope null void zero none gone gloom grim grief gap rot rust ruin rip rift rash sink sank sunk slow slump stuck stall stale sore sour sick sigh sob slip
toy trap tank tear torn trip trouble tired thin trash bug bugs bust bum bore bored boring broke broken bomb burn burnt bleak blah blame blank blind blunder
crash crap cry cost costs crack crude creep cringe curse fake fear foe fog fool fret fuss flaw fade fired fizz hurt hole hell hollow hang hard harm hate
ill idle itch junk jam kill knot lunch lonely lack lax limp mute myth meh mock moot nag numb oops odd ouch pain pale pest pit panic plain poor pity
quit rage raw rat rant scam scar sham shy silly snag spam spill spent stink stop strain stress sulk sweat tax tomb toil tragic trick ugly upset vain vent vex
waste weak weep wet woe worry worse worst wreck wrong wail yawn yuck ash sunk solo alone unpaid unsold unseen unknown zilch flub goof gaffe gloom dip drown drowned
sinking leaking rusty dusty soggy murky shaky broke lonely nobody nothing naught cheap tacky
""".split())
POS = set("""success succeed victory victor triumph win winner winning champion glory fortune profit revenue growth growing grow scale scaling boost thrive
launch launched launches shipped shipping ship sail sailing voyage harbor harbour anchor captain pilot navigator compass horizon journey venture adventure
treasure gold golden rich wealth unicorn rocket startup founder brand branding pitch traction momentum thrust robust demand market marketing audience
product release deploy install invent inventor genius hero legend premium prestige epic smash bestseller hit viral trending famous fame star stardom
breakthrough milestone payday jackpot bonus reward award prize crown summit peak climb rise rising soar flagship shipshape seaworthy steady voyage
boarding onboarding onboard aboard admiral commodore mariner sailor crew skipper helm rudder keel mast cruise cruising dream dreamboat paradise
inspire inspired insight ideal idea ideas pride proud praise promise prosper prosperity progress promote promoted profitable proven premier prime
vision visionary valuable value equity invest investor funding funded deal deals exit acquired ipo leader leading lead excellent excellence superb
amazing awesome brilliant stellar super supreme ultimate grand great greatest bright shine shining sparkle glowing blessing lucky luck charm charming
strong strength power powerful force forward ahead onward upward first best better perfect master masterpiece clever smart wise trust trusted
graph chart metrics ascend ascent accelerate accelerator scaleup upscale leverage synergy disrupt disruptor innovate innovation create creator craft
""".split())
def dels(w, k=2):
    for idx in itertools.combinations(range(len(w)), k):
        r = ''.join(c for i,c in enumerate(w) if i not in idx)
        yield r, idx
print("== A. aspirational/nautical/startup word -> failure word, exactly 2 letters removed ==")
rows=[]
for w in POS:
    if w not in vocab: continue
    for r, idx in dels(w):
        if r in NEG:
            rem=''.join(w[i] for i in idx); cont = idx[1]==idx[0]+1
            rows.append((w,r,rem,cont,idx))
seen=set()
for w,r,rem,cont,idx in sorted(rows):
    if (w,r) in seen: continue
    seen.add((w,r))
    pos = 'prefix' if idx==(0,1) else ('suffix' if idx==(len(w)-2,len(w)-1) else ('together' if cont else 'apart'))
    print(f"  {w.upper():12} -> {r.upper():8} drop {rem.upper():3} ({pos})")
print()
print("== B. a meaningful pair falls off (PR, AD, UI, UX, AI, IT, CX, CTA-ish) and a real word remains ==")
PAIRS = ['pr','ad','ui','ux','ai','it','cx','ml','qa','os','ci','cd','db','js','go']
out=[]
for w in words:
    if not (4 <= len(w) <= 11) or fz(w) < 3.0: continue
    for p in PAIRS:
        i = w.find(p)
        while i != -1:
            r = w[:i]+w[i+2:]
            if len(r)>=3 and r in vocab and fz(r) >= 3.0:
                out.append((p, w, r, i, fz(w)))
            i = w.find(p, i+1)
by = {}
for p,w,r,i,f in out: by.setdefault(p,[]).append((f,w,r,i))
for p in PAIRS:
    L = sorted(by.get(p,[]), reverse=True)[:40]
    if L: print(f"  [{p.upper()}] " + ", ".join(f"{w.upper()}→{r.upper()}" for f,w,r,i in L))
