# @beda/transom

The name board with nailed, hanging and fallen letters. Server markup looks right without
JavaScript; the client controller takes the same markup over and animates state changes.

```astro
---
import Transom from '@beda/transom/Transom.astro';
---
<Transom letters={['П','О','Б','Е','Д','А']} nails={[1, 0, 4, 4, 4, 4]} id="hero" />
<script>
  import { attachTransom } from '@beda/transom/client';
  const tr = attachTransom(document.getElementById('hero')!);
  tr.set([1, 0, 0, 4, 4, 4]);                 // animated
  tr.set([4, 4, 4, 4, 4, 4], { animate: false });
</script>
```

| Export | What |
| --- | --- |
| `renderTransom({ letters, nails?, size?, label?, id? })` | HTML string with the state applied, `role="img"` + Russian `aria-label` |
| `attachTransom(root)` | `{ letters, nails, set(nails, { animate }) }` |
| `MOUNTS`, `DEFAULT_MOUNT` | nail positions (em) and hang angles; index 0 is the hinge |
| `Transom.astro` | Astro wrapper; imports `transom.css` |
| `transom.css` | all sizes in `em` of `--ts`; colours from `@beda/tokens` |

Nails per slot: ≥ 2 on the board, 1 hanging (`.hang`), 0 fallen (`.fall`). The swing plays
only when a letter starts hanging (`.swinging`, removed on `animationend`), so server-rendered
hanging letters stay still. Reduced motion disables transitions and the swing.
