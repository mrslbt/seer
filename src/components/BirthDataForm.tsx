import { useState, useCallback, useEffect } from 'react';
import type { BirthData } from '../types/astrology';
import { searchCities, type CityData, formatCity } from '../lib/cities';
import './BirthDataForm.css';

interface BirthDataFormProps {
  onSubmit: (birthData: BirthData) => void;
  initialData?: BirthData | null;
}

export function BirthDataForm({ onSubmit, initialData }: BirthDataFormProps) {
  const [dateStr, setDateStr] = useState(
    initialData?.date ? initialData.date.toISOString().split('T')[0] : ''
  );
  const [timeStr, setTimeStr] = useState(initialData?.time || '12:00');
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
        setError('Enter your birth date');
        return;
      }

      if (!selectedCity) {
        setError('Select a city from suggestions');
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

      onSubmit(birthData);
    },
    [dateStr, timeStr, selectedCity, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="birth-form">
      <div className="form-intro">
        <p className="form-intro-text">
          The Seer requires your celestial coordinates
        </p>
      </div>

      <div className="form-field">
        <label className="field-label">Date of Birth</label>
        <input
          type="date"
          className="field-input"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className="form-field">
        <label className="field-label">Time of Birth</label>
        <input
          type="time"
          className="field-input"
          value={timeStr}
          onChange={(e) => setTimeStr(e.target.value)}
        />
        <span className="field-hint">If unknown, use 12:00</span>
      </div>

      <div className="form-field">
        <label className="field-label">Place of Birth</label>
        <div className="city-wrapper">
          <input
            type="text"
            className="field-input"
            value={cityQuery}
            onChange={(e) => handleCityInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Start typing..."
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
        Enter
      </button>
    </form>
  );
}
