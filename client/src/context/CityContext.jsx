import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CityContext = createContext(null);
const STORAGE_KEY = 'cinebook:city';

function readSavedCity() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode / storage blocked
  }
}

export function CityProvider({ children }) {
  const [city, setCityState] = useState(readSavedCity);
  // First visit: open the picker straight away, like BookMyShow does.
  const [pickerOpen, setPickerOpen] = useState(() => !readSavedCity());

  const setCity = useCallback((next) => {
    setCityState(next);
    setPickerOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not critical */
    }
  }, []);

  const value = useMemo(
    () => ({
      city,
      setCity,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
    }),
    [city, setCity, pickerOpen],
  );

  return <CityContext value={value}>{children}</CityContext>;
}

export const useCity = () => useContext(CityContext);
