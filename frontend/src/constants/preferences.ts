export type Theme = 'light' | 'dark';
export type NumberLocale = 'en-US' | 'de-DE';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type FirstDayOfWeek = 0 | 1;

export const PREFERENCES_KEY = 'midas-preferences';

export interface Preferences {
  numberLocale: NumberLocale;
  dateFormat: DateFormat;
  firstDayOfWeek: FirstDayOfWeek;
  showMoney: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  numberLocale: 'en-US',
  dateFormat: 'MM/DD/YYYY',
  firstDayOfWeek: 0,
  showMoney: true,
};

export const NUMBER_LOCALE_OPTIONS: { value: NumberLocale; label: string; example: string }[] = [
  { value: 'en-US', label: 'US', example: '1,000.00' },
  { value: 'de-DE', label: 'EU', example: '1.000,00' },
];

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export const FIRST_DAY_OPTIONS: { value: FirstDayOfWeek; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
];
