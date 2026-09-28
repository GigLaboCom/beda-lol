# Поиск каламбуров для отвала

Скрипты, которыми искали и проверяли варианты из `tactics/10-otval-katalog.md`.

> **В репо beda-lol:** каталог лежит в `docs/tactics/10-otval-katalog.md`, компонент — в `archive/src/transom-falls.html`, отрисовки — в `archive/design/puns/`. Скрипты сохранены как есть, с путями архива (`/tmp/pf.ttf` и относительные пути); это справка, в сборке и CI они не участвуют. `11-verify-gags.py` заменит тест Vitest на данных `@beda/core` (шаг S08d).

Зависимости: `pip install wordfreq Pillow cairosvg`; шрифт Playfair Display (вариативный TTF из репозитория google/fonts) по пути `/tmp/pf.ttf` — поправьте путь в скриптах отрисовки.

| Скрипт | Что делает |
| --- | --- |
| `01-en-two-drops-raw.py` | английский: все удаления двух букв → слово-провал, сырой список |
| `02-en-aspirational-and-pairs.py` | «победные» исходные слова; отпадающие осмысленные пары (PR, AD, UI, UX, AI, IT…) |
| `03-en-by-failure-flavour.py` | результаты по группам: сленг, морские беды, провал, настроение, деньги |
| `04-en-letter-breaks.py` | надломы букв (R→P, B→P, O→C, G→C…) вместе с падениями |
| `05-en-themed-words-and-phrases.py` | тематические слова и выражения про запуск и продукт, минимум два падения |
| `06-ru-themed-search.py` | русский: кириллические надломы, падения, фразы, отпадающие ПО/ПР/ИТ/ИИ |
| `07-render-latin-breaks.py` | отрисовка латинских надломов для проверки читаемости |
| `08-render-cyrillic-breaks.py` | то же для кириллицы |
| `09-render-phrase-breaks.py` | GOLD RUSH и BEST BET на доске транца |
| `10-favicon-variants.py` | варианты иконки и превью в реальных размерах |
| `11-verify-gags.py` | проверка, что все варианты в компоненте дают заявленный результат |
