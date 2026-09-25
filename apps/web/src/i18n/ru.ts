/**
 * Russian UI copy. Every user-facing string goes through this dictionary,
 * even while Russian is the only language. Wording follows the prototype
 * (archive/site/yacht-beda-site.html); placeholders stay in square brackets.
 */
export const ru = {
  'site.name': 'Яхта «Беда»',
  'site.title': 'Яхта «Беда» — рубрика о пет-проектах',
  'site.description':
    'Рубрика о тех, кто строит пет-проекты, плывя на яхте «Беда»: код пишется, маркетинга нет. Здесь можно осмотреть своё судно и прибить буквы обратно.',
  'common.soon': 'скоро',
  'a11y.skip': 'Перейти к содержанию',

  'head.logoLabel': 'Яхта «Беда», на главную',
  'head.navLabel': 'Разделы',
  'nav.osmotr': 'Осмотр судна',
  'nav.namer': 'Как назовёшь',
  'nav.letters': 'Буквы',
  'nav.harbor': 'Гавань',
  'nav.journal': 'Журнал',
  'head.cta': 'Подписаться на рубрику',

  'foot.about':
    'Рубрику ведёт Денис — разработчик и соло-фаундер. Сам плывёт на «Беде» и ведёт журнал публично.',
  'foot.navLabel': 'Контакты',
  'foot.channel': 'Канал рубрики',
  'foot.journal': 'Журнал',
  'foot.write': 'Написать',
  /** Real URLs replace these placeholders; until then the links render as plain text. */
  'foot.channelHref': '[ссылка на канал]',
  'foot.contactHref': '[контакт]',

  'hero.kicker': 'Рубрика о пет-проектах',
  'hero.title1': 'ПО у тебя есть.',
  'hero.title2': 'Победы нет.',
  'hero.cta': 'Пройти осмотр судна',
  'hero.ctaNote': '12 вопросов, полторы минуты',
  'hero.caption': 'ПО + БЕДА = ПОБЕДА. Отвалится ПО — останется БЕДА.',

  'namer.title': 'Как назовёшь',
  'namer.lead':
    'Впиши название проекта — посмотрим, что от него останется, если отвалится пара букв.',
  'namer.label': 'Название проекта',
  'namer.placeholder': 'например, Победа',
  'namer.submit': 'Спустить на воду',

  'pillars.title': 'Шесть букв — шесть вещей, на которых держится проект',
  'pillars.lead':
    'Первыми отваливаются П и О. Это ровно то, что разработчики пропускают чаще всего, — и ровно то, без чего от победы остаётся беда.',
  'pillars.firstTag': 'отваливается первой',

  'harbor.kicker': 'Гавань',
  'harbor.title': 'Выбери причал',
  'harbor.kindEntry': 'вход',
  'harbor.kindWeekly': 'каждую неделю',
  'harbor.kindCommunity': 'сообщество',
  'harbor.osmotr.title': 'Осмотр судна',
  'harbor.osmotr.text': 'Двенадцать честных вопросов — и видно, какие буквы у тебя уже отвалились.',
  'harbor.osmotr.meta': 'полторы минуты',
  'harbor.namer.title': 'Как назовёшь',
  'harbor.namer.text': 'Что останется от названия твоего проекта, если отвалится пара букв.',
  'harbor.namer.meta': 'десять секунд',
  'harbor.leak.title': 'Калькулятор течи',
  'harbor.leak.text': 'Пять ползунков про твою неделю — и уровень воды в трюме. Формула открыта.',
  'harbor.leak.meta': 'минута',
  'harbor.storm.title': 'Шторм',
  'harbor.storm.text':
    'Восемь недель, сорок часов, один человек на борту. Доплывёшь до первых десяти?',
  'harbor.storm.meta': '3–5 минут',
  'harbor.tracker.title': 'Прибей букву обратно',
  'harbor.tracker.text':
    'Твоя яхта начинает с «Беды». Каждое маленькое действие — гвоздь на место.',
  'harbor.tracker.meta': '24 гвоздя до победы',
  'harbor.log.title': 'Бортовой журнал',
  'harbor.log.text': 'Часы на код против часов на маркетинг. При перекосе яхта кренится.',
  'harbor.log.meta': 'публично',
  'harbor.registry.title': 'Судовой реестр',
  'harbor.registry.text': 'Поставь свой проект в гавань. Брось круг другому — получишь свой.',
  'harbor.registry.meta': '[N] яхт у причала',
  'harbor.triangle.title': 'Бермудский треугольник',
  'harbor.triangle.text':
    'Оставь эпитафию брошенному проекту. Любой может попробовать поднять его со дна.',
  'harbor.triangle.meta': '[N] судов на дне',

  'log.kicker': 'Бортовой журнал автора',
  'log.title': 'Я тоже на этой яхте',
  'log.lead':
    'Каждую неделю — часы на код, часы на продвижение и одна честная строчка. Крен считается по последним двум неделям.',
  'log.svgLabel': 'Схема: при перекосе в код яхта кренится на правый борт',
  'log.heel': 'крен [°]',
  'log.entryDate': '[дата], неделя [N]',
  'log.entryStats': 'код [ч], маркетинг [ч], коммитов [N], постов [N]',
  'log.entryQuote1': '«ещё одну фичу — и тогда напишу».',
  'log.entryQuote': '[строчка недели]',
  'log.all': 'Весь журнал',

  'triangle.kicker': 'Бермудский треугольник',
  'triangle.title': 'Здесь покоятся наши проекты',
  'triangle.cta': 'Оставить эпитафию',
  'triangle.years': '[годы плавания]',
  'triangle.firstO': 'первой отвалилась О',
  'triangle.firstAny': 'первой отвалилась [буква]',
  'triangle.name': '[Название проекта]',
  'triangle.epitaph1': 'Здесь покоятся [N] строк кода. Пользователей — ноль. Тесты — зелёные.',
  'triangle.example': 'пример эпитафии',
  'triangle.epitaph2': '[Эпитафия до 140 символов]',
  'triangle.raisers': '[N] хотят поднять',
  'triangle.raise': 'Поднять со дна',
  'triangle.emptyTitle': 'Место для твоего судна',
  'triangle.emptyText': 'Что строил, почему бросил, какая буква отвалилась первой. Можно анонимно.',

  'quiz.title': 'Осмотр судна — 12 вопросов о пет-проекте',
  'quiz.description':
    'Двенадцать честных вопросов о пет-проекте — и видно, какие буквы ПОБЕДЫ у тебя уже отвалились. Полторы минуты, без регистрации.',
  'quiz.count': 'вопрос {n} из 12',
  'quiz.exit': 'Выйти',
  'quiz.caption': 'Каждое «нет» выбивает клёпки.',
  'quiz.pillarOf': '{pillar}, вопрос {n} из 2',
  'quiz.yes': 'Да',
  'quiz.partly': 'Частично',
  'quiz.no': 'Нет',
  'quiz.back': 'Назад',
  'quiz.privacy': 'ответы не отправляются — только итог, анонимно',
  'quiz.progressLabel': 'Прогресс осмотра',

  'result.title': 'Результат осмотра судна',
  'result.kicker': 'Класс судна',
  'result.state.on': 'прибита',
  'result.state.hang': 'висит',
  'result.state.fall': 'упала',
  'result.copy': 'Скопировать ссылку',
  'result.copied': 'Ссылка скопирована',
  'result.copyFailed': 'Не получилось скопировать — выдели адрес в строке браузера',
  'result.retry': 'Пройти заново',
  'result.checkYours': 'Проверить своё судно',
  'result.actionsTitle': 'Три гвоздя на эту неделю',
  'result.toTracker': 'Прибить буквы обратно',
  'result.ogAlt': 'Транец с надписью ПОБЕДА: какие буквы отвалились',

  'namerPage.title': 'Как назовёшь — что останется от названия проекта',
  'namerPage.description':
    'Впиши название пет-проекта и посмотри, что от него останется, если отвалится пара букв. Игра рубрики «Яхта Беда».',
  'namerPage.kicker': 'Игра',
  'namerPage.lead':
    'Название — первое, что видят люди. Впиши своё и посмотри, что от него останется, если отвалится пара букв, как на транце «Беды». Название не уходит на сервер.',
  'namerPage.again': 'Проверить своё судно целиком',

  'letters.title': 'Буквы',
  'letters.indexTitle': 'Шесть букв ПОБЕДЫ',
  'letters.indexDescription':
    'Позиционирование, общение с людьми, бесплатная ценность, единая точка входа, дистрибуция, аналитика: шесть вещей, на которых держится пет-проект.',
  'letters.crumbs': 'Хлебные крошки',
  'letters.pager': 'Соседние буквы',
  'letters.cta': 'Посмотри, какие буквы держатся у твоего проекта.',
} as const;

export type Key = keyof typeof ru;

/** Looks up a string; keys are type-checked. */
export function t(key: Key): string {
  return ru[key];
}

/** Placeholder values like `[ссылка на канал]` are not real URLs yet. */
/** Fills `{name}` slots: `fmt(t('quiz.count'), { n: 3 })`. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

export function isPlaceholder(value: string): boolean {
  return value.startsWith('[') && value.endsWith(']');
}
