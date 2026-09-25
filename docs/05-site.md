# 05 — Rubric website (`site/yacht-beda-site.html`)

A single self-contained HTML page: the rubric's landing page from the design mockup plus three working mechanics — the **ship inspection quiz**, the **"Как назовёшь" name game** and the **"Моя яхта" tracker**. No build step, no framework, no server. Only Google Fonts are loaded from the network.

The page is the interactive counterpart of the design canvas (`design/`, see `06-design-mockup.md`). Where they differ, the differences are listed in §11.

---

## 1. Running

Open the file in a browser. Everything works offline except the web fonts; without them the page falls back to Georgia / Helvetica / Menlo and stays usable.

Progress in the tracker and the last quiz result are saved in `localStorage` under the key `yacht-beda-v1`. This is per browser and per device; nothing leaves the machine.

---

## 2. Structure

One HTML file, three views, one inline stylesheet, one IIFE script.

```
<header class="site-head">          sticky, respects the top safe-area inset
<main id="view-home">               landing page
<main id="view-quiz" hidden>
   #quizRun                          question screen
   #quizResult hidden                result screen + three actions
<main id="view-yacht" hidden>        tracker
<script>                             data, transom renderer, quiz, name game, tracker, router
```

### 2.1 Routing

Hash-based, handled by `route()` on load and on `hashchange`:

| Hash | View | Side effect |
|---|---|---|
| `#osmotr` | quiz | `startQuiz()` resets answers, scrolls to top |
| `#yacht` | tracker | `renderYacht(false)` from stored state |
| anything else | home | if an element with that id exists, scroll to it (`#harbor`, `#journal`, `#triangle`, `#namerTitle`, `#subscribe`) |

Nav links for quiz and tracker get `aria-current="page"` when active.

### 2.2 Home sections

| Section | id | Content |
|---|---|---|
| Hero | `top` | headline, lead, CTA to `#osmotr`, animated transom (§3.6), pun caption |
| Name game | — (`namerTitle` on the heading) | form + result (§5) |
| Pillars | — | six cards generated from `PILLARS`; П and О marked "отваливается первой" |
| Harbour | `harbor` | eight mooring cards; three are marked "скоро" and are not links |
| Author's log | `journal` | heel diagram (inline SVG) and three log entries with placeholders |
| Bermuda triangle | `triangle` | example epitaph, placeholder epitaph with "Поднять со дна", empty slot |
| Footer | `subscribe` | author line, links with placeholders |

---

## 3. Transom renderer

The same component draws the letters in the hero, the quiz, the result, the tracker and the name game.

### 3.1 API

```js
var tr = buildTransom(hostElement, lettersArray);   // builds DOM once
setTransom(tr, countsArray, animate);                // applies state
```

`counts[i]` is the number of fixings still holding letter `i`, 0…4:

| Count | State | CSS class on `.slot` |
|---|---|---|
| ≥ 2 | on the transom | — |
| 1 | hanging on the last fixing | `hang` |
| 0 | fallen onto the shelf | `fall` |

A space in `lettersArray` becomes a narrow empty slot (`.slot.space`, `0.35em`).

### 3.2 Units

Everything is in `em` relative to the host's font size, which each context sets through `--ts`. One variable scales the letters, fixings, plank seams, border radius and fall distance together.

| Measure | Value |
|---|---|
| slot | `0.75em × 1.07em` |
| gap between slots | `0.1em` |
| plank padding | `0.46em 0.4em 0.5em` |
| plank seams | every `0.4em`, 0.02em dark line (`repeating-linear-gradient`) |
| stern shape | `border-radius: .09em .09em 1.4em 1.4em / .09em .09em .75em .75em` |
| shelf | `0.55em` tall, `0.09em` top edge, `0.52em` below the plank |
| fixing | `0.072em` circle |

For six letters the transom is ≈ `5.8em` wide. The `--ts` values are chosen so that this fits the column it sits in:

| Context | `--ts` |
|---|---|
| hero, desktop | `clamp(44px, 6.4vw, 96px)` |
| hero, ≤ 900 px | `clamp(44px, 13vw, 100px)` |
| quiz | `clamp(40px, 5.2vw, 84px)` |
| result | `clamp(40px, 5.4vw, 88px)` |
| tracker | `clamp(40px, 5.6vw, 92px)` |
| name game | computed in JS: `min(64, max(20, available / (n·0.85 + 0.8)))` px |

### 3.3 Fixings — `MOUNTS`

Per-letter positions in `em` from the slot's top-left corner. Index 0 is the hinge: it holds longest and is the rotation origin (`--ox`, `--oy`).

| Letter | Fixings (hinge first) | Hang angle |
|---|---|---|
| П | top-left, top-right, bottom-left, bottom-right | 37° |
| О | left-bottom, left-top, right-top, right-bottom (rivets on the oval) | 124° |
| Б | corners | 34° |
| Е | corners | 36° |
| Д | top corners, feet | 30° |
| А | apex, two feet, crossbar | 6° |
| anything else | `DEFAULT_MOUNT` (corners) | 34° |

Angles are CSS `rotate()` — positive is clockwise. For П the centre of mass is down-right of the hinge, so a small clockwise turn lets it hang. For О the hinge is the left-bottom rivet and the centre is up-right of it, so it has to swing clockwise through ≈ 124° to end up below the rivet — the same topple as on the animation bench. For А the hinge is the apex, directly above the centre, so it barely moves.

These values are hand-tuned for Playfair Display Black; unlike the three.js bench, fixings are not snapped to ink pixels. With a fallback font they will sit slightly off the strokes.

### 3.4 Motion

| Transition | How |
|---|---|
| mounted → hanging | class `hang`: `transform: rotate(var(--hang))` plus the `swing` keyframes, 2.8 s |
| any → fallen | class `fall`: `translate(var(--fx), var(--drop)) rotate(var(--fr))`, 0.75 s, accelerating curve `cubic-bezier(.55,0,1,.45)` |
| fallen/hanging → mounted | transform back to `none`, 0.8 s, decelerating curve |
| fixing removed | `.nail.off`: drops `1.25em`, fades, 0.55 s; a dark hole stays |

`swing` is four damped oscillations around the hang angle, written as multipliers so one keyframe set serves every letter:

```
0% 0 → 16% ×1.42 → 34% ×0.70 → 52% ×1.20 → 70% ×0.88 → 86% ×1.05 → 100% ×1.00
```

This mirrors the bench's `θ(t) = eq·(1 − e^(−λt)·cos ωt)` visually, not numerically.

Fall parameters are deterministic per slot index so the same state always lands the same way: `--fx = ±(0.04 + ((i·37) mod 10)/70) em`, `--fr = ±(6 + (i·53) mod 12)°`, alternating sign; `--drop = 1.12em` (slot bottom to shelf plus the glyph's baseline offset).

`animate = false` adds `.still` to disable transitions for the first paint and removes it two animation frames later, so views never open mid-animation.

### 3.5 Accessibility

The transom element gets `role="img"` and an `aria-label` that spells what is still on it, e.g. "Надпись на транце: пусто пусто БЕДА". Individual glyphs are `aria-hidden`.

`prefers-reduced-motion: reduce` disables all transitions and keyframes and collapses the hero and result timers to zero, so state changes appear instantly.

### 3.6 Hero sequence

On load: all letters mounted → at 0.9 s П drops to one fixing and swings → at 3.9 s О falls to the shelf. It runs once per page load.

---

## 4. Ship inspection quiz

### 4.1 Questions

Twelve questions, two per letter, in word order (`QUESTIONS`). Each has the question and a one-line hint. Answers: **Да** = 1, **Частично** = 0.5, **Нет** = 0. "Назад" removes the last answer.

### 4.2 Live nails during the quiz

```
pops[letter] += (answer == 0 ? 2 : answer == 0.5 ? 1 : 0)
live[letter]  = max(0, 4 − pops[letter])
```

So one "no" knocks out two fixings, two "no" knock the letter off.

### 4.3 Final state

Score per letter is the sum of its two answers (0…2). Mapping to fixings:

| Score | Fixings | State |
|---|---|---|
| 2 | 4 | mounted |
| 1.5 | 3 | mounted |
| 1 or 0.5 | 1 | hanging |
| 0 | 0 | fallen |

On the result screen the transom starts from the live state and letters switch to their final state one by one, left to right, at `500 + 520·i` ms.

### 4.4 Class

`mounted` = number of letters with ≥ 2 fixings.

| Condition (checked in order) | Class |
|---|---|
| П and О fallen, every other letter at least hanging | Классическая «Беда» — special text about the pun |
| 6 mounted | Флагман |
| 4–5 | Шхуна на ходу |
| 2–3 | Классическая «Беда» |
| 0–1 | Корпус на стапеле |

### 4.5 Actions and sharing

Up to three letters with score < 2, weakest first, each with one action from `ACTS` (time, title, description). If everything scored 2, О, Д and Б are shown.

Share text: `Прошёл осмотр судна: у меня __БЕДА. А у тебя?` with fallen letters as underscores. "Скопировать текст" uses `navigator.clipboard.writeText`; on failure a status line asks the user to select the text manually. No image generation yet.

"Прибить буквы обратно" copies the final fixings into the tracker and opens `#yacht`.

---

## 5. Name game — "Как назовёшь"

1. Input is collapsed to single spaces, trimmed, upper-cased and cut to **14 characters**.
2. `findRemoval(name)`: for every word in `FUNNY` (≈ 60 Russian and English words: беда, баг, дыра, течь, крах, dead, fail, bug…) test whether it is a **subsequence** of the name's letters, using the leftmost match. A match must leave at least one letter to remove. The longest matching word wins.
3. If nothing matches, the first two letters fall off (one if the name has three letters or fewer). If the remainder hits the stop-list, only the first letter falls.
4. The letters render on a transom sized to the name; after 450 ms the removed ones fall.
5. Verdict text: "Было / Стало" plus a line that depends on whether a real word was found. Russian plural of "отвалившаяся буква" is handled for 1, 2–4 and 5+.

Behaviour on sample inputs:

| Input | Result |
|---|---|
| ПОБЕДА | БЕДА (П, О fall) |
| БАГТРЕКЕР | БАГ |
| DEADLINE | DEAD |
| ТАСК МЕНЕДЖЕР | АД |
| ТРЕКЕР | no word → ЕКЕР |

The word list is intentionally tiny; the hit rate on real project names is unknown and probably low. See tactic 02 for the full plan (dictionaries, curated jokes, optional LLM verdicts).

The stop-list only has to cover the fallback path — results from `FUNNY` are safe by construction.

---

## 6. Tracker — "Моя яхта"

- State: `store.nails`, six integers 0…4. Default and "Начать с «Беды»": `[0, 0, 4, 4, 4, 4]` — П and О on the shelf, the rest nailed.
- Transom at the top, counter "N из 24 гвоздей", progress bar, "до победы — K" (or "ПОБЕДА" at 24).
- Six letter cards: pillar name, status (`прибита` / `N из 4` / `висит` / `на полке`), four fixing dots, a one-line description, and — while not full — the next step from `STEPS[letter][count]` with a **Прибил** button.
- **Прибил** increments the count, saves, re-renders with animation and returns focus to the same card's button.
- Rust is described but not implemented.

Storage wrapper: every `localStorage` access is in `try/catch`; if storage is unavailable the tracker still works for the session.

---

## 7. Design tokens in CSS

All colours are custom properties on `:root`. The site is dark-first by design; the dark-scheme overrides only deepen `--tar` and `--hull` slightly. Main tokens:

| Token | Value | Use |
|---|---|---|
| `--tar` | `#1C140E` | page ground |
| `--hull` | `#2A1E15` | dark cards, log |
| `--plank` / `--seam` / `--plank-hi` | `#6E4B2D` / `#4B321E` / `#8A6038` | transom wood, ghost imprint |
| `--canvas` / `--canvas-2` | `#EDE4CF` / `#F7F1E3` | light sections, cards on them |
| `--brass` / `--brass-hi` / `--brass-deep` | `#D6A93E` / `#EBC565` / `#7A5716` | letters, primary buttons, accents on light |
| `--rust` / `--rust-hi` / `--rust-ink` | `#C2542D` / `#E88A62` / `#A33A18` | fallen state, warnings |
| `--sea` / `--sea-2` / `--sea-muted` | `#151E22` / `#1E2A2F` / `#9FB3B8` | Bermuda triangle only |

Fonts: Playfair Display 700/900 (display, letters), IBM Plex Sans 400/500/600 (text), IBM Plex Mono 400/500 (log, counters). All three cover Cyrillic.

---

## 8. Responsiveness and platform details

- Breakpoints: 1100 px (pillars 6→3 columns, moorings 4→2), 980 px (nav hidden), 900 px (two-column blocks stack), 620 px (pillars 2 columns, cards 1 column), 560 px (moorings 1 column, header CTA hidden).
- `viewport-fit=cover`; `:root` pads top and bottom by the safe-area insets; the sticky header sits at `top: env(safe-area-inset-top)`; `scroll-padding-top` accounts for the header when jumping to anchors.
- `main { overflow-x: clip }` guards against a falling letter causing horizontal scroll on narrow screens.
- Touch targets are ≥ 44 px; keyboard focus is a 2 px brass outline.

---

## 9. Placeholders

Everything the site cannot know is in square brackets: channel and contact links, site address in the copied share text, project name in the tracker, log dates and numbers, registry and triangle counts, epitaph fields. Search the file for `[` to find them all.

---

## 10. Known issues

1. **Share image.** Only text is copied. The planned PNG card (see `design/canvas/ShareCard.dc.html`) needs a canvas render or a server-side OG image.
2. **Fixings are not glyph-snapped** (§3.3). The bench's ink-snapping approach can be ported by drawing each glyph to an offscreen canvas.
3. **Hanging О** swings through 124° and can overlap the neighbouring slot at large sizes; the bench solves this with a small "lean" offset towards the viewer, which has no direct 2D equivalent. A slight `scale(0.96)` or `z-index` bump during `hang` would be the CSS approximation.
4. **Back during result reveal.** Leaving the result screen while letters are still falling lets pending timers update a hidden transom. Harmless, but the timers should be cleared on route change.
5. **Name game coverage** is limited by the word list (§5).
6. **Rust, reminders, registry, triangle submissions, calculator, storm** are not implemented; their cards are marked "скоро" or use placeholders.
7. **Fonts.** Letter shapes and fixing positions assume Playfair Display; the fallback serif changes both.

---

## 11. Differences from the design canvas

| Aspect | Canvas | Site |
|---|---|---|
| Labels | mostly all-caps mono eyebrows | sentence case, fewer of them |
| Meta strings | several "A · B" joins | rewritten as plain phrases |
| Link and button text | some end with "→" | arrows removed |
| Hanging О in the tracker | rotated −128° (wrong way) | rotated +124° (correct, matches the bench) |
| Transom | static drawing | live component with motion |
| Harbour cards | all look clickable | unbuilt ones are not links and marked "скоро" |

The first three were deliberate: they are common "template" tells and the site reads better without them. The canvas can be brought in line if it will be used for further design work.
