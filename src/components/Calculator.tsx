import { useState, useMemo } from 'react';
import {
  Recipe,
  Ingredient,
  Packaging,
  PricingSettings,
  unitLabels,
} from '../types';

interface Props {
  recipes: Recipe[];
  ingredients: Ingredient[];
  packagings: Packaging[];
  settings: PricingSettings;
}

// אחוזי רווח מוצעים
const PROFIT_PRESETS = [
  { label: '50%', value: 50 },
  { label: '100%', value: 100 },
  { label: '150%', value: 150 },
  { label: '200%', value: 200 },
];

// המרת יחידות לחישוב עלות
function convertToBaseUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;

  // המרות לגרם
  if (toUnit === 'kg' && fromUnit === 'g') return quantity / 1000;
  if (toUnit === 'g' && fromUnit === 'kg') return quantity * 1000;
  
  // המרות למ"ל
  if (toUnit === 'l' && fromUnit === 'ml') return quantity / 1000;
  if (toUnit === 'ml' && fromUnit === 'l') return quantity * 1000;
  
  // המרות כפות וכוסות
  if (fromUnit === 'tbsp' && (toUnit === 'ml' || toUnit === 'l')) {
    const ml = quantity * 15;
    return toUnit === 'l' ? ml / 1000 : ml;
  }
  if (fromUnit === 'tsp' && (toUnit === 'ml' || toUnit === 'l')) {
    const ml = quantity * 5;
    return toUnit === 'l' ? ml / 1000 : ml;
  }
  if (fromUnit === 'cup' && (toUnit === 'ml' || toUnit === 'l')) {
    const ml = quantity * 240;
    return toUnit === 'l' ? ml / 1000 : ml;
  }

  return quantity;
}

// עיגול למחיר "יפה"
function roundToNicePrice(price: number): number {
  if (price < 20) return Math.ceil(price);
  if (price < 50) return Math.ceil(price / 5) * 5;
  if (price < 100) return Math.ceil(price / 10) * 10;
  return Math.ceil(price / 25) * 25;
}

export function Calculator({ recipes, ingredients, packagings, settings }: Props) {
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedPackagingId, setSelectedPackagingId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [profitPercent, setProfitPercent] = useState(100);
  const [customPrice, setCustomPrice] = useState('');
  const [includeDelivery, setIncludeDelivery] = useState(false);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const selectedPackaging = packagings.find((p) => p.id === selectedPackagingId);

  const pricing = useMemo(() => {
    if (!selectedRecipe) return null;

    // חישוב עלות חומרי גלם בלבד
    let ingredientsCost = 0;
    for (const recipeIng of selectedRecipe.ingredients) {
      const ingredient = ingredients.find((i) => i.id === recipeIng.ingredientId);
      if (ingredient) {
        const convertedQty = convertToBaseUnit(
          recipeIng.quantity,
          recipeIng.unit,
          ingredient.unit
        );
        ingredientsCost += convertedQty * ingredient.pricePerUnit;
      }
    }

    // עלות ליחידה אחת (מהמתכון)
    const costPerUnitFromRecipe = ingredientsCost / selectedRecipe.yield;
    const totalIngredientsCost = costPerUnitFromRecipe * quantity;

    // עלות אריזה
    const packagingCost = selectedPackaging ? selectedPackaging.cost * quantity : 0;

    // עלות משלוח
    const deliveryCost = includeDelivery ? settings.deliveryCost : 0;

    // סך עלות (רק חומרים + אריזה + משלוח)
    const totalCost = totalIngredientsCost + packagingCost + deliveryCost;
    const costPerUnit = totalCost / quantity;

    // מחיר לפי אחוז רווח נבחר
    const calculatedPrice = totalCost * (1 + profitPercent / 100);
    
    // מחיר בפועל (מותאם אישית או מחושב)
    const actualPrice = customPrice ? parseFloat(customPrice) : calculatedPrice;
    
    // מחיר מעוגל מומלץ
    const roundedPrice = roundToNicePrice(calculatedPrice);

    // רווח
    const profit = actualPrice - totalCost;
    const actualProfitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    // מחיר ליחידה בודדת
    const pricePerUnit = actualPrice / quantity;

    // נקודת איזון - כמה יחידות צריך למכור כדי לכסות עלות קבועה (נניח 500₪)
    const fixedCosts = 500; // עלות קבועה לדוגמה
    const profitPerUnit = pricePerUnit - costPerUnit;
    const breakEvenUnits = profitPerUnit > 0 ? Math.ceil(fixedCosts / profitPerUnit) : 0;

    return {
      ingredientsCost: totalIngredientsCost,
      packagingCost,
      deliveryCost,
      totalCost,
      costPerUnit,
      calculatedPrice,
      actualPrice,
      roundedPrice,
      profit,
      actualProfitPercent,
      pricePerUnit,
      breakEvenUnits,
    };
  }, [selectedRecipe, selectedPackaging, quantity, profitPercent, customPrice, includeDelivery, ingredients, settings]);

  return (
    <div className="section">
      <div className="section-header">
        <h2>🧮 מחשבון תמחור</h2>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>יש להוסיף מתכונים קודם כדי לחשב תמחור</p>
        </div>
      ) : (
        <div className="calculator-container">
          <div className="calculator-inputs">
            <div className="form-group">
              <label>בחר מתכון</label>
              <select
                value={selectedRecipeId}
                onChange={(e) => {
                  setSelectedRecipeId(e.target.value);
                  setCustomPrice('');
                }}
              >
                <option value="">בחר מתכון...</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>כמות</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              {selectedRecipe && (
                <span className="hint">{selectedRecipe.yieldUnit}</span>
              )}
            </div>

            <div className="form-group">
              <label>אריזה</label>
              <select
                value={selectedPackagingId}
                onChange={(e) => setSelectedPackagingId(e.target.value)}
              >
                <option value="">ללא אריזה</option>
                {packagings.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} (₪{pkg.cost})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={includeDelivery}
                  onChange={(e) => setIncludeDelivery(e.target.checked)}
                />
                כולל משלוח (₪{settings.deliveryCost})
              </label>
            </div>

            {/* בחירת אחוז רווח */}
            <div className="form-group">
              <label>אחוז רווח על העלות</label>
              <div className="profit-presets">
                {PROFIT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`preset-btn ${profitPercent === preset.value ? 'active' : ''}`}
                    onClick={() => {
                      setProfitPercent(preset.value);
                      setCustomPrice('');
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="custom-profit">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={profitPercent}
                  onChange={(e) => {
                    setProfitPercent(parseInt(e.target.value) || 0);
                    setCustomPrice('');
                  }}
                />
                <span>%</span>
              </div>
            </div>

            <div className="form-group">
              <label>או: מחיר ידני (יחושב האחוז)</label>
              <input
                type="number"
                step="1"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="הזן מחיר..."
              />
            </div>
          </div>

          {pricing && selectedRecipe && (
            <div className="calculator-results">
              {/* סיכום עלות */}
              <div className="cost-summary-box">
                <h3>💰 עלות חומרים</h3>
                <div className="big-number">₪{pricing.ingredientsCost.toFixed(2)}</div>
                {pricing.packagingCost > 0 && (
                  <div className="sub-cost">+ אריזה: ₪{pricing.packagingCost.toFixed(2)}</div>
                )}
                {pricing.deliveryCost > 0 && (
                  <div className="sub-cost">+ משלוח: ₪{pricing.deliveryCost.toFixed(2)}</div>
                )}
                <div className="total-cost">
                  סה"כ עלות: <strong>₪{pricing.totalCost.toFixed(2)}</strong>
                </div>
                {quantity > 1 && (
                  <div className="per-unit">עלות ליחידה: ₪{pricing.costPerUnit.toFixed(2)}</div>
                )}
              </div>

              {/* מחירים מומלצים */}
              <div className="pricing-options">
                <h3>🏷️ מחיר מכירה</h3>
                
                <div className="price-cards">
                  <div className={`price-card ${!customPrice ? 'selected' : ''}`}>
                    <div className="price-label">לפי {profitPercent}% רווח</div>
                    <div className="price-value">₪{pricing.calculatedPrice.toFixed(0)}</div>
                  </div>
                  
                  <div 
                    className="price-card recommended"
                    onClick={() => setCustomPrice(pricing.roundedPrice.toString())}
                  >
                    <div className="price-label">מחיר מעוגל 👍</div>
                    <div className="price-value">₪{pricing.roundedPrice}</div>
                  </div>

                  {customPrice && (
                    <div className="price-card selected">
                      <div className="price-label">המחיר שלך</div>
                      <div className="price-value">₪{parseFloat(customPrice).toFixed(0)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* רווח */}
              <div className="profit-display">
                <h3>📈 רווח</h3>
                <div className={`profit-big ${pricing.profit >= 0 ? 'positive' : 'negative'}`}>
                  <span className="profit-amount">₪{pricing.profit.toFixed(2)}</span>
                  <span className="profit-percent">({pricing.actualProfitPercent.toFixed(0)}% על העלות)</span>
                </div>
                {quantity > 1 && (
                  <div className="profit-per-unit">
                    רווח ליחידה: ₪{(pricing.profit / quantity).toFixed(2)}
                  </div>
                )}
              </div>

              {/* המלצות נוספות */}
              <div className="pricing-tips">
                <h4>💡 טיפים</h4>
                <ul>
                  <li>
                    <strong>מחיר ליחידה:</strong> ₪{pricing.pricePerUnit.toFixed(2)}
                  </li>
                  {pricing.breakEvenUnits > 0 && pricing.breakEvenUnits < 1000 && (
                    <li>
                      <strong>נקודת איזון:</strong> צריך למכור {pricing.breakEvenUnits} יחידות כדי לכסות ₪500 הוצאות קבועות
                    </li>
                  )}
                  <li>
                    <strong>אם תמכור ב-₪{pricing.roundedPrice}:</strong> רווח של ₪{(pricing.roundedPrice - pricing.totalCost).toFixed(2)} ({((pricing.roundedPrice - pricing.totalCost) / pricing.totalCost * 100).toFixed(0)}%)
                  </li>
                </ul>
              </div>

              {/* פירוט חומרי גלם */}
              {selectedRecipe.ingredients.length > 0 && (
                <div className="ingredients-detail">
                  <h4>📋 פירוט חומרי גלם</h4>
                  <ul>
                    {selectedRecipe.ingredients.map((recipeIng, index) => {
                      const ingredient = ingredients.find((i) => i.id === recipeIng.ingredientId);
                      if (!ingredient) return null;
                      const convertedQty = convertToBaseUnit(
                        recipeIng.quantity,
                        recipeIng.unit,
                        ingredient.unit
                      );
                      const cost = convertedQty * ingredient.pricePerUnit;
                      return (
                        <li key={index}>
                          <span>{ingredient.name}</span>
                          <span>
                            {recipeIng.quantity} {unitLabels[recipeIng.unit]} = ₪{cost.toFixed(2)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
