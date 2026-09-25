# 06 — Design mockup (`design/canvas/`)

The website mockup lives on a Design canvas (a claude.ai artifact). The files in `design/canvas/` are an exact copy of the canvas's own data at the time of archiving: one `.dc.html` per artboard plus `canvas.json` (layout). They render only inside the Design canvas editor; for a page that opens in any browser, use `site/yacht-beda-site.html`.

## Artboards

| File | Title | Size | Canvas position | Prototype links |
|---|---|---|---|---|
| `Main.dc.html` | Главная | 1440 × 4460 | (0, 0) | CTA → Quiz, "Прибей букву" → Tracker |
| `Quiz.dc.html` | Осмотр судна — вопрос | 1440 × 900 | (1520, 0) | answers → Result |
| `Result.dc.html` | Осмотр судна — результат | 1440 × 1180 | (3040, 0) | "Прибить буквы обратно" → Tracker |
| `Tracker.dc.html` | Прибей букву обратно — моя яхта | 1440 × 1320 | (4560, 0) | logo → Main |
| `ShareCard.dc.html` | Картинка для шеринга | 1200 × 630 | (1520, 1020) | — |
| `Mobile.dc.html` | Главная — телефон | 390 × 1640 | (1520, 1770) | CTA → Quiz |

All except the share card are marked interactive, so the canvas shows a Play button and the links work in Play mode.

## States shown

- **Main hero:** П hanging on its top-left nail, О fallen onto the shelf with its four rivets lying next to it.
- **Quiz:** question 3 of 12 (first О question); П has lost its top-right nail; О outlined as current.
- **Result:** "Классическая «Беда»" — П and О fallen, Д hanging, Б/Е/А nailed; chips per letter; three actions (П, О, Д).
- **Tracker:** 14 of 24 nails — П 4, О 1 (hanging), Б 3, Е 4, Д 0 (on the shelf), А 2. Brass = with proof link, iron = without.
- **Share card:** "У меня — классическая «Беда»", transom with П and О on the shelf.

## Visual system

Same tokens and fonts as the site (`05-site.md` §7). The canvas uses no design-system artifact; it has its own small system:

- dark tarred-wood ground, brass letters and primary buttons, bleached-canvas light sections as the contrast rhythm;
- cold sea palette used only for the Bermuda triangle, to mark it as "under water";
- transom drawn as a plank block with a stern-shaped bottom radius and seam lines, letters in Playfair Display Black with a 2–3 px dark bottom shadow as engraving, nails as small brass circles, empty holes as dark dots, ghost imprints in lighter unweathered wood.

## Known issues

- **Hanging О in `Tracker.dc.html` is rotated the wrong way** (−128° instead of about +124°). The site has it right.
- Some all-caps labels, "·" separators and "→" arrows remain on the canvas; the site removed them (see `05-site.md` §11).

## Live link

The canvas: https://claude.ai/artifact/MjhEduNatgPjtqQRvvmyph — private to its owner until shared.
