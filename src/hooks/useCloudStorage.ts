import { useState, useEffect, useCallback } from 'react';
import { AppData, PricingSettings } from '../types';

const JSONBIN_API_KEY = '$2a$10$oZfLFV8vjYJgPdjv3gZK9O5OD2tUEsH30F7mZMQh4CDJqtrN3qIfq';
const JSONBIN_BIN_ID_KEY = 'bakery-jsonbin-id';

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

export function useCloudStorage() {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [binId, setBinId] = useState<string | null>(null);

  // יצירת bin חדש או טעינה מקיים
  useEffect(() => {
    const initBin = async () => {
      const storedBinId = localStorage.getItem(JSONBIN_BIN_ID_KEY);
      
      if (storedBinId) {
        // טעינה מ-bin קיים
        try {
          const response = await fetch(`https://api.jsonbin.io/v3/b/${storedBinId}/latest`, {
            headers: {
              'X-Master-Key': JSONBIN_API_KEY,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            setData({
              ...defaultData,
              ...result.record,
              settings: { ...defaultSettings, ...result.record?.settings },
            });
            setBinId(storedBinId);
          } else {
            // אם ה-bin לא קיים, ניצור חדש
            await createNewBin();
          }
        } catch (error) {
          console.error('Error loading data:', error);
          await createNewBin();
        }
      } else {
        // יצירת bin חדש
        await createNewBin();
      }
      
      setIsLoaded(true);
    };

    const createNewBin = async () => {
      try {
        const response = await fetch('https://api.jsonbin.io/v3/b', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Name': 'nitzan-bakery-data',
          },
          body: JSON.stringify(defaultData),
        });
        
        if (response.ok) {
          const result = await response.json();
          const newBinId = result.metadata.id;
          localStorage.setItem(JSONBIN_BIN_ID_KEY, newBinId);
          setBinId(newBinId);
        }
      } catch (error) {
        console.error('Error creating bin:', error);
      }
    };

    initBin();
  }, []);

  // שמירה לענן
  const saveToCloud = useCallback(async (newData: AppData) => {
    if (!binId) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(newData),
      });
      
      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
    setIsSaving(false);
  }, [binId]);

  // עדכון נתונים
  const updateData = useCallback((newData: AppData) => {
    setData(newData);
    saveToCloud(newData);
  }, [saveToCloud]);

  // פונקציות עדכון
  const updateIngredients = (ingredients: AppData['ingredients']) => {
    const newData = { ...data, ingredients };
    updateData(newData);
  };

  const updateRecipes = (recipes: AppData['recipes']) => {
    const newData = { ...data, recipes };
    updateData(newData);
  };

  const updatePackagings = (packagings: AppData['packagings']) => {
    const newData = { ...data, packagings };
    updateData(newData);
  };

  const updateSettings = (settings: PricingSettings) => {
    const newData = { ...data, settings };
    updateData(newData);
  };

  const updateProducts = (products: AppData['products']) => {
    const newData = { ...data, products };
    updateData(newData);
  };

  const updateOrders = (orders: AppData['orders']) => {
    const newData = { ...data, orders };
    updateData(newData);
  };

  // רענון מהענן
  const refreshFromCloud = async () => {
    if (!binId) return;
    
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setData({
          ...defaultData,
          ...result.record,
          settings: { ...defaultSettings, ...result.record?.settings },
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // ייצוא וייבוא
  const exportData = () => {
    const exportObj = { ...data, binId };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakery-pricing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as AppData & { binId?: string };
          
          // אם יש binId בקובץ, נשתמש בו
          if (imported.binId) {
            localStorage.setItem(JSONBIN_BIN_ID_KEY, imported.binId);
            setBinId(imported.binId);
          }
          
          const newData = {
            ...defaultData,
            ...imported,
            settings: { ...defaultSettings, ...imported.settings },
          };
          
          setData(newData);
          await saveToCloud(newData);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // קישור למכשיר אחר
  const getShareCode = () => binId;
  
  const connectWithCode = async (code: string) => {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${code}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        localStorage.setItem(JSONBIN_BIN_ID_KEY, code);
        setBinId(code);
        setData({
          ...defaultData,
          ...result.record,
          settings: { ...defaultSettings, ...result.record?.settings },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting with code:', error);
      return false;
    }
  };

  return {
    data,
    isLoaded,
    isSaving,
    lastSaved,
    updateIngredients,
    updateRecipes,
    updatePackagings,
    updateProducts,
    updateOrders,
    updateSettings,
    exportData,
    importData,
    refreshFromCloud,
    getShareCode,
    connectWithCode,
  };
}
