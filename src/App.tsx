import { useState, useEffect } from 'react';
import { useCloudStorage } from './hooks/useCloudStorage';
import { Ingredients } from './components/Ingredients';
import { Recipes } from './components/Recipes';
import { Calculator } from './components/Calculator';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import './App.css';

type Tab = 'orders' | 'products' | 'reports' | 'calculator' | 'ingredients' | 'recipes' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  const {
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
    getShareCode,
    connectWithCode,
  } = useCloudStorage();

  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>טוען...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="ניצן - משהו מתוק" className="logo" />
        </div>
        <h1>ניהול קונדיטוריה</h1>
        <button 
          className="theme-toggle" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'מצב בהיר' : 'מצב כהה'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 הזמנות
        </button>
        <button
          className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🎁 מארזים
        </button>
        <button
          className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 דוחות
        </button>
        <button
          className={`nav-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          🧮 תמחור
        </button>
        <button
          className={`nav-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          🥚 חומרים
        </button>
        <button
          className={`nav-btn ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          📖 מתכונים
        </button>
        <button
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'orders' && (
          <Orders
            orders={data.orders || []}
            products={data.products || []}
            onUpdate={updateOrders}
          />
        )}
        {activeTab === 'products' && (
          <Products
            products={data.products || []}
            recipes={data.recipes || []}
            ingredients={data.ingredients || []}
            onUpdate={updateProducts}
          />
        )}
        {activeTab === 'reports' && (
          <Reports
            orders={data.orders || []}
            products={data.products || []}
          />
        )}
        {activeTab === 'calculator' && (
          <Calculator
            recipes={data.recipes}
            ingredients={data.ingredients}
            packagings={data.packagings}
            settings={data.settings}
          />
        )}
        {activeTab === 'ingredients' && (
          <Ingredients
            ingredients={data.ingredients}
            onUpdate={updateIngredients}
          />
        )}
        {activeTab === 'recipes' && (
          <Recipes
            recipes={data.recipes}
            ingredients={data.ingredients}
            onUpdate={updateRecipes}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            settings={data.settings}
            packagings={data.packagings}
            onUpdateSettings={updateSettings}
            onUpdatePackagings={updatePackagings}
            onExport={exportData}
            onImport={importData}
            shareCode={getShareCode()}
            onConnectWithCode={connectWithCode}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          <span className="sync-status">
            {isSaving ? '🔄 שומר...' : lastSaved ? `✅ ${lastSaved.toLocaleTimeString('he-IL')}` : '☁️'}
          </span>
          {' | '}
          <span className="stats">
            {(data.orders || []).length} הזמנות | {(data.products || []).length} מארזים
          </span>
        </p>
      </footer>
    </div>
  );
}

export default App;
