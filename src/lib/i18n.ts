export type Locale = 'en' | 'ru' | 'uz_lat' | 'uz_cy';

export const DEFAULT_LOCALE: Locale = 'en';

type UiDictionary = {
  upload: {
    calendar: string;
    manual: string;
  };
};

const DICTIONARIES: Record<Locale, UiDictionary> = {
  en: {
    upload: {
      calendar: 'Calendar',
      manual: 'Manual',
    },
  },
  // Placeholders for future rollout. Keep EN active for now.
  ru: {
    upload: {
      calendar: 'Calendar',
      manual: 'Manual',
    },
  },
  uz_lat: {
    upload: {
      calendar: 'Calendar',
      manual: 'Manual',
    },
  },
  uz_cy: {
    upload: {
      calendar: 'Calendar',
      manual: 'Manual',
    },
  },
};

export function getUiText(locale: Locale = DEFAULT_LOCALE): UiDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
