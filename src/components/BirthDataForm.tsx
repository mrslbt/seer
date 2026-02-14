import { useState, useCallback, useEffect } from 'react';
import type { BirthData } from '../types/astrology';
import { searchCities, type CityData, formatCity } from '../lib/cities';
import { useI18n } from '../i18n/I18nContext';
import './BirthDataForm.css';

export interface EmailData {
  email: string;
  consent: boolean;
}

interface BirthDataFormProps {
  onSubmit: (birthData: BirthData, name: string, emailData?: EmailData) => void;
  initialData?: BirthData | null;
  initialName?: string;
}

// Format a Date to YYYY-MM-DD using local timezone (not UTC)
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function BirthDataForm({ onSubmit, initialData, initialName }: BirthDataFormProps) {
  const { t } = useI18n();
  const isEditing = !!initialData;
  const [name, setName] = useState(initialName || '');
  const [dateStr, setDateStr] = useState(
    initialData?.date ? formatLocalDate(initialData.date) : ''
  );
  const [timeStr, setTimeStr] = useState(initialData?.time || '12:00');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [cityQuery, setCityQuery] = useState(
    initialData ? `${initialData.city}, ${initialData.country}` : ''
  );
  const [selectedCity, setSelectedCity] = useState<CityData | null>(
    initialData
      ? {
          city: initialData.city,
          country: initialData.country,
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          timezone: initialData.timezone,
        }
      : null
  );
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [email, setEmail] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);
  const [error, setError] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  // Sync form state when initialData changes (e.g., reopening settings)
  useEffect(() => {
    if (initialData) {
      setDateStr(formatLocalDate(initialData.date));
      setTimeStr(initialData.time || '12:00');
      setCityQuery(`${initialData.city}, ${initialData.country}`);
      setSelectedCity({
        city: initialData.city,
        country: initialData.country,
        latitude: initialData.latitude,
        longitude: initialData.longitude,
        timezone: initialData.timezone,
      });
      setError('');
    }
  }, [initialData]);

  useEffect(() => {
    if (initialName !== undefined) {
      setName(initialName);
    }
  }, [initialName]);

  useEffect(() => {
    if (cityQuery.length >= 2 && !selectedCity) {
      const results = searchCities(cityQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setActiveSuggestion(-1);
  }, [cityQuery, selectedCity]);

  const handleCitySelect = useCallback((city: CityData) => {
    setSelectedCity(city);
    setCityQuery(formatCity(city));
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  }, []);

  const handleCityInputChange = useCallback((value: string) => {
    setCityQuery(value);
    setSelectedCity(null);
  }, []);

  const handleCityKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      handleCitySelect(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, activeSuggestion, handleCitySelect]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!dateStr) {
        setError(t('form.errorDate'));
        return;
      }

      if (!selectedCity) {
        setError(t('form.errorCity'));
        return;
      }

      // Parse as local date (not UTC) by splitting the YYYY-MM-DD string
      const [year, month, day] = dateStr.split('-').map(Number);
      const birthDate = new Date(year, month - 1, day);

      const birthData: BirthData = {
        date: birthDate,
        time: timeStr,
        city: selectedCity.city,
        country: selectedCity.country,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        timezone: selectedCity.timezone,
      };

      const emailData = email.trim() ? { email: email.trim(), consent: emailConsent } : undefined;
      onSubmit(birthData, name.trim() || 'Cosmic Traveler', emailData);
    },
    [dateStr, timeStr, selectedCity, name, email, emailConsent, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="birth-form" noValidate>
      <div className="form-intro">
        <p className="form-intro-text">
          {isEditing ? t('form.titleEdit') : t('form.title')}
        </p>
      </div>

      <div className="form-field">
        <label className="field-label" htmlFor="birth-name">{t('form.name')}</label>
        <input
          id="birth-name"
          type="text"
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          autoComplete="off"
        />
      </div>

      <div className="form-field">
        <label className="field-label" htmlFor="birth-date">{t('form.date')}</label>
        <input
          id="birth-date"
          type="date"
          className="field-input"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          max={formatLocalDate(new Date())}
          required
          aria-required="true"
          aria-describedby={error ? 'birth-form-error' : undefined}
        />
      </div>

      <div className="form-field">
        <label className="field-label" htmlFor="birth-time">{t('form.time')}</label>
        {!timeUnknown && (
          <input
            id="birth-time"
            type="time"
            className="field-input"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
          />
        )}
        <label className="field-toggle">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) => {
              setTimeUnknown(e.target.checked);
              if (e.target.checked) setTimeStr('12:00');
            }}
          />
          <span className="field-toggle-text">{t('form.noTime')}</span>
        </label>
        {timeUnknown && (
          <span className="field-hint">{t('form.noTimeHint')}</span>
        )}
      </div>

      <div className="form-field">
        <label className="field-label" htmlFor="birth-city">{t('form.place')}</label>
        <div className="city-wrapper">
          <input
            id="birth-city"
            type="text"
            className="field-input"
            value={cityQuery}
            onChange={(e) => handleCityInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleCityKeyDown}
            placeholder={t('form.placePlaceholder')}
            autoComplete="off"
            required
            aria-required="true"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            aria-controls="city-suggestions"
            aria-activedescendant={activeSuggestion >= 0 ? `city-option-${activeSuggestion}` : undefined}
            aria-describedby={error ? 'birth-form-error' : undefined}
          />
          {showSuggestions && (
            <ul className="suggestions" id="city-suggestions" role="listbox">
              {suggestions.map((city, index) => (
                <li
                  key={`${city.city}-${city.country}-${index}`}
                  id={`city-option-${index}`}
                  className={`suggestion${index === activeSuggestion ? ' suggestion--active' : ''}`}
                  role="option"
                  aria-selected={index === activeSuggestion}
                  onClick={() => handleCitySelect(city)}
                >
                  {formatCity(city)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedCity && (
          <span className="field-hint selected">
            {Math.abs(selectedCity.latitude).toFixed(1)}{'\u00B0'}{selectedCity.latitude >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(selectedCity.longitude).toFixed(1)}{'\u00B0'}{selectedCity.longitude >= 0 ? 'E' : 'W'}
          </span>
        )}
      </div>

      {!isEditing && (
        <div className="form-field">
          <label className="field-label" htmlFor="birth-email">{t('form.email')}</label>
          <input
            id="birth-email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form.emailPlaceholder')}
            autoComplete="email"
          />
          <span className="field-hint">{t('form.emailHint')}</span>
          {email.trim() && (
            <label className="field-toggle">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
              />
              <span className="field-toggle-text">{t('form.emailConsent')}</span>
            </label>
          )}
        </div>
      )}

      {error && <div className="form-error" id="birth-form-error" role="alert">{error}</div>}

      <button type="submit" className="submit-btn">
        {isEditing ? t('form.save') : t('form.enter')}
      </button>
    </form>
  );
}
