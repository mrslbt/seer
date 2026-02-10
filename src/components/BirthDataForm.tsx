import { useState, useCallback, useEffect } from 'react';
import type { BirthData } from '../types/astrology';
import { searchCities, type CityData, formatCity } from '../lib/cities';
import { useI18n } from '../i18n/I18nContext';
import './BirthDataForm.css';

interface BirthDataFormProps {
  onSubmit: (birthData: BirthData, name: string) => void;
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
  const [error, setError] = useState('');

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
  }, [cityQuery, selectedCity]);

  const handleCitySelect = useCallback((city: CityData) => {
    setSelectedCity(city);
    setCityQuery(formatCity(city));
    setShowSuggestions(false);
  }, []);

  const handleCityInputChange = useCallback((value: string) => {
    setCityQuery(value);
    setSelectedCity(null);
  }, []);

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

      onSubmit(birthData, name.trim() || 'Cosmic Traveler');
    },
    [dateStr, timeStr, selectedCity, name, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="birth-form">
      <div className="form-intro">
        <p className="form-intro-text">
          {isEditing ? t('form.titleEdit') : t('form.title')}
        </p>
      </div>

      <div className="form-field">
        <label className="field-label">{t('form.name')}</label>
        <input
          type="text"
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          autoComplete="off"
        />
      </div>

      <div className="form-field">
        <label className="field-label">{t('form.date')}</label>
        <input
          type="date"
          className="field-input"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          max={formatLocalDate(new Date())}
        />
      </div>

      <div className="form-field">
        <label className="field-label">{t('form.time')}</label>
        {!timeUnknown && (
          <input
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
        <label className="field-label">{t('form.place')}</label>
        <div className="city-wrapper">
          <input
            type="text"
            className="field-input"
            value={cityQuery}
            onChange={(e) => handleCityInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={t('form.placePlaceholder')}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul className="suggestions">
              {suggestions.map((city, index) => (
                <li
                  key={`${city.city}-${city.country}-${index}`}
                  className="suggestion"
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

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="submit-btn">
        {isEditing ? t('form.save') : t('form.enter')}
      </button>
    </form>
  );
}
