import { type Locale, useTranslations } from '../../i18n';
import { CATEGORY_IDS, type Choice } from '../../lib/consent';

/** The category list shared by the banner and `/cookies`: necessary (fixed), then each optional one. */
export default function Categories({
  lang,
  choice,
  onChange,
  idPrefix,
}: {
  lang: Locale;
  choice: Choice;
  onChange: (choice: Choice) => void;
  /** Keeps checkbox ids unique when the banner and the settings are on one page. */
  idPrefix: string;
}) {
  const t = useTranslations(lang);
  return (
    <ul class="consent-cats">
      <li>
        <div>
          <span class="consent-cat-name">{t('consent.cat.essential')}</span>
          <p>{t('consent.cat.essential.desc')}</p>
        </div>
        <span class="consent-always">{t('consent.always')}</span>
      </li>
      {CATEGORY_IDS.map((id) => (
        <li key={id}>
          <div>
            <label class="consent-cat-name" for={`${idPrefix}-${id}`}>
              {t(`consent.cat.${id}` as const)}
            </label>
            <p id={`${idPrefix}-${id}-desc`}>{t(`consent.cat.${id}.desc` as const)}</p>
          </div>
          <input
            type="checkbox"
            class="consent-switch"
            id={`${idPrefix}-${id}`}
            data-category={id}
            aria-describedby={`${idPrefix}-${id}-desc`}
            checked={choice[id]}
            onChange={(e) => onChange({ ...choice, [id]: (e.target as HTMLInputElement).checked })}
          />
        </li>
      ))}
    </ul>
  );
}
