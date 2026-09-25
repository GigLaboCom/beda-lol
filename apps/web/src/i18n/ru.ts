/**
 * Russian UI copy. Every user-facing string goes through this dictionary,
 * even while Russian is the only language.
 */
export const ru = {
  'site.name': 'Яхта «Беда»',
  'site.title': 'Яхта «Беда» — рубрика о пет-проектах',
  'site.description':
    'Рубрика о тех, кто строит пет-проекты, плывя на яхте «Беда»: код пишется, маркетинга нет. Здесь можно осмотреть своё судно и прибить буквы обратно.',
  'a11y.skip': 'Перейти к содержанию',
  'head.logoLabel': 'Яхта «Беда», на главную',
  'head.navLabel': 'Разделы',
  'nav.osmotr': 'Осмотр судна',
  'nav.yacht': 'Моя яхта',
  'nav.harbor': 'Гавань',
  'nav.triangle': 'Треугольник',
  'nav.journal': 'Журнал',
  'head.cta': 'Подписаться на рубрику',
  'foot.about':
    'Рубрику ведёт Денис — разработчик и соло-фаундер. Сам плывёт на «Беде» и ведёт журнал публично.',
  'foot.navLabel': 'Контакты',
  'foot.channel': 'Канал рубрики',
  'foot.journal': 'Журнал',
  'foot.write': 'Написать',
  'foot.channelHref': '[ссылка на канал]',
  'foot.contactHref': '[контакт]',
  'hero.kicker': 'Рубрика о пет-проектах',
  'hero.title1': 'ПО у тебя есть.',
  'hero.title2': 'Победы нет.',
  'hero.cta': 'Пройти осмотр судна',
  'hero.ctaNote': '12 вопросов, полторы минуты',
  'hero.caption': 'ПО + БЕДА = ПОБЕДА. Отвалится ПО — останется БЕДА.',
} as const;

export type Key = keyof typeof ru;

/** Looks up a string; keys are type-checked. */
export function t(key: Key): string {
  return ru[key];
}
