import { useState, useEffect } from 'react';
import { AppData, PricingSettings } from '../types';

const defaultSettings: PricingSettings = {
  laborCostPerHour: 50,
  profitMarginPercent: 30,
  deliveryCost: 30,
  overheadPercent: 10,
};

const defaultData: AppData = {
  ingredients: [],
  recipes: [],
  packagings: [
    { id: '1', name: 'קופסה רגילה', cost: 5 },
    { id: '2', name: 'קופסה מהודרת', cost: 15 },
    { id: '3', name: 'שקית צלופן', cost: 2 },
  ],
  products: [],
  orders: [],
  settings: defaultSettings,
};

const STORAGE_KEY = 'bakery-pricing-data';

export function useLocalStorage() {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);

  // טעינה מ-localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        setData({
          ...defaultData,
          ...parsed,
          settings: { ...defaultSettings, ...parsed.settings },
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoaded(true);
  }, []);

  // שמירה ל-localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving data:', error);
      }
    }
  }, [data, isLoaded]);

  // פונקציות עדכון
  const updateIngredients = (ingredients: AppData['ingredients']) => {
    setData((prev) => ({ ...prev, ingredients }));
  };

  const updateRecipes = (recipes: AppData['recipes']) => {
    setData((prev) => ({ ...prev, recipes }));
  };

  const updatePackagings = (packagings: AppData['packagings']) => {
    setData((prev) => ({ ...prev, packagings }));
  };

  const updateSettings = (settings: PricingSettings) => {
    setData((prev) => ({ ...prev, settings }));
  };

  // ייצוא וייבוא
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakery-pricing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as AppData;
          setData({
            ...defaultData,
            ...imported,
            settings: { ...defaultSettings, ...imported.settings },
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  return {
    data,
    isLoaded,
    updateIngredients,
    updateRecipes,
    updatePackagings,
    updateSettings,
    exportData,
    importData,
  };
}
