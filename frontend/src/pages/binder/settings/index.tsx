import { Select, SelectItem, Button } from '@heroui/react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../hooks/useTheme';
import { usePreferences } from '../../../hooks/usePreferences';
import {
  NUMBER_LOCALE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  FIRST_DAY_OPTIONS,
} from '../../../constants/preferences';

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const {
    numberLocale,
    dateFormat,
    firstDayOfWeek,
    setNumberLocale,
    setDateFormat,
    setFirstDayOfWeek,
  } = usePreferences();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex flex-col gap-4">
        {/* Theme */}
        <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Theme</h2>
          <p className="text-sm text-app-muted mb-3">Choose between light and dark mode</p>
          <Button
            variant="light"
            onPress={toggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg h-auto"
          >
            {theme === 'light' ? <MoonIcon width={22} /> : <SunIcon width={22} />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </Button>
        </section>

        {/* Display value format */}
        <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Display value format</h2>
          <p className="text-sm text-app-muted mb-3">How numbers are displayed</p>
          <Select
            label="Format"
            variant="flat"
            selectedKeys={[numberLocale]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setNumberLocale(String(val) as typeof numberLocale);
            }}
            className="max-w-xs"
          >
            {NUMBER_LOCALE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} textValue={`${opt.label} (${opt.example})`}>
                {opt.label} ({opt.example})
              </SelectItem>
            ))}
          </Select>
        </section>

        {/* Date format */}
        <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Date format</h2>
          <p className="text-sm text-app-muted mb-3">How dates are displayed</p>
          <Select
            label="Format"
            variant="flat"
            selectedKeys={[dateFormat]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setDateFormat(String(val) as typeof dateFormat);
            }}
            className="max-w-xs"
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value}>{opt.label}</SelectItem>
            ))}
          </Select>
        </section>

        {/* First day of week */}
        <section className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">First day of the week</h2>
          <p className="text-sm text-app-muted mb-3">Sets which day starts the week</p>
          <Select
            label="Day"
            variant="flat"
            selectedKeys={[String(firstDayOfWeek)]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) setFirstDayOfWeek(Number(val) as 0 | 1);
            }}
            className="max-w-xs"
          >
            {FIRST_DAY_OPTIONS.map((opt) => (
              <SelectItem key={String(opt.value)}>{opt.label}</SelectItem>
            ))}
          </Select>
        </section>
      </div>
    </div>
  );
}
