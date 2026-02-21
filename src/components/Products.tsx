import { useState, useMemo } from 'react';
import { Product, ProductComponent, Recipe, Ingredient, RecipeIngredient } from '../types';

interface Props {
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  onUpdate: (products: Product[]) => void;
}

// המרת יחידות לחישוב עלות
function convertToBaseUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  if (toUnit === 'kg' && fromUnit === 'g') return quantity / 1000;
  if (toUnit === 'g' && fromUnit === 'kg') return quantity * 1000;
  if (toUnit === 'l' && fromUnit === 'ml') return quantity / 1000;
  if (toUnit === 'ml' && fromUnit === 'l') return quantity * 1000;
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

// חישוב עלות חומר גלם בודד
function calculateIngredientCost(
  recipeIng: RecipeIngredient,
  ingredientsList: Ingredient[]
): number {
  const ingredient = ingredientsList.find((i) => i.id === recipeIng.ingredientId);
  if (!ingredient) return 0;
  const convertedQty = convertToBaseUnit(recipeIng.quantity, recipeIng.unit, ingredient.unit);
  return convertedQty * ingredient.pricePerUnit;
}

// חישוב עלות מתכון שלם
function getRecipeTotalCost(recipe: Recipe, ingredientsList: Ingredient[]): number {
  return recipe.ingredients.reduce((total, ing) => {
    return total + calculateIngredientCost(ing, ingredientsList);
  }, 0);
}

// חישוב עלות ליחידה של מתכון
function getRecipeCostPerUnit(recipe: Recipe, ingredientsList: Ingredient[]): number {
  const totalCost = getRecipeTotalCost(recipe, ingredientsList);
  return totalCost / recipe.yield;
}

// אחוזי רווח מוצעים
const SUGGESTED_PROFITS = [50, 100, 150, 200, 300];

export function Products({ products, recipes, ingredients, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    components: [] as ProductComponent[],
    profitPercent: '100',
    sellingPrice: '',
    isActive: true,
  });

  const [recipeSearch, setRecipeSearch] = useState('');
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
  const [newComponent, setNewComponent] = useState({
    recipeId: '',
    quantity: '1',
  });

  // סינון מתכונים לפי חיפוש
  const filteredRecipes = recipes.filter((rec) =>
    rec.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const selectRecipe = (recipe: Recipe) => {
    setNewComponent({ ...newComponent, recipeId: recipe.id });
    setRecipeSearch(recipe.name);
    setShowRecipeDropdown(false);
  };

  // חישוב עלות כוללת של המארז
  const totalIngredientsCost = useMemo(() => {
    return form.components.reduce((total, comp) => {
      const recipe = recipes.find((r) => r.id === comp.recipeId);
      if (!recipe) return total;
      const costPerUnit = getRecipeCostPerUnit(recipe, ingredients);
      return total + costPerUnit * comp.quantity;
    }, 0);
  }, [form.components, recipes, ingredients]);

  // חישוב מחיר מכירה מומלץ לפי אחוז רווח (עיגול כלפי מעלה)
  const suggestedPrice = useMemo(() => {
    const profitPercent = parseFloat(form.profitPercent) || 100;
    return Math.ceil(totalIngredientsCost * (1 + profitPercent / 100));
  }, [totalIngredientsCost, form.profitPercent]);

  // חישוב הרווח בפועל אם יש מחיר ידני
  const actualProfit = useMemo(() => {
    const price = parseFloat(form.sellingPrice) || suggestedPrice;
    if (totalIngredientsCost === 0) return 0;
    return ((price - totalIngredientsCost) / totalIngredientsCost) * 100;
  }, [form.sellingPrice, totalIngredientsCost, suggestedPrice]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      components: [],
      profitPercent: '100',
      sellingPrice: '',
      isActive: true,
    });
    setIsAdding(false);
    setEditingId(null);
    setRecipeSearch('');
    setNewComponent({ recipeId: '', quantity: '1' });
  };

  const addComponentToProduct = () => {
    if (!newComponent.recipeId || !newComponent.quantity) return;
    
    // בדוק אם המתכון כבר קיים במארז
    const existingIndex = form.components.findIndex(c => c.recipeId === newComponent.recipeId);
    if (existingIndex >= 0) {
      // עדכן כמות
      const updated = [...form.components];
      updated[existingIndex].quantity += parseInt(newComponent.quantity);
      setForm({ ...form, components: updated });
    } else {
      setForm({
        ...form,
        components: [
          ...form.components,
          {
            recipeId: newComponent.recipeId,
            quantity: parseInt(newComponent.quantity),
          },
        ],
      });
    }
    setNewComponent({ recipeId: '', quantity: '1' });
    setRecipeSearch('');
  };

  const removeComponentFromProduct = (index: number) => {
    setForm({
      ...form,
      components: form.components.filter((_, i) => i !== index),
    });
  };

  const updateComponentQuantity = (index: number, quantity: number) => {
    const updated = [...form.components];
    updated[index].quantity = quantity;
    setForm({ ...form, components: updated });
  };

  const getRecipeName = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    return recipe?.name || 'לא נמצא';
  };

  const getRecipeYieldUnit = (id: string) => {
    const recipe = recipes.find((r) => r.id === id);
    return recipe?.yieldUnit || 'יחידות';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const finalPrice = form.sellingPrice ? Math.ceil(parseFloat(form.sellingPrice)) : suggestedPrice;

    if (editingId) {
      onUpdate(
        products.map((prod) =>
          prod.id === editingId
            ? {
                ...prod,
                name: form.name,
                description: form.description,
                components: form.components,
                ingredientsCost: totalIngredientsCost,
                profitPercent: parseFloat(form.profitPercent),
                sellingPrice: finalPrice,
                isActive: form.isActive,
                updatedAt: now,
              }
            : prod
        )
      );
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        name: form.name,
        description: form.description,
        components: form.components,
        ingredientsCost: totalIngredientsCost,
        profitPercent: parseFloat(form.profitPercent),
        sellingPrice: finalPrice,
        isActive: form.isActive,
        createdAt: now,
        updatedAt: now,
      };
      onUpdate([...products, newProduct]);
    }
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      components: product.components || [],
      profitPercent: product.profitPercent?.toString() || '100',
      sellingPrice: product.sellingPrice.toString(),
      isActive: product.isActive,
    });
    setEditingId(product.id);
    setIsAdding(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('למחוק את המארז?')) {
      onUpdate(products.filter((prod) => prod.id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    onUpdate(
      products.map((prod) =>
        prod.id === id
          ? { ...prod, isActive: !prod.isActive, updatedAt: Date.now() }
          : prod
      )
    );
  };

  const handleDuplicate = (product: Product) => {
    const now = Date.now();
    const duplicatedProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      name: `${product.name} (עותק)`,
      components: product.components ? [...product.components] : [],
      createdAt: now,
      updatedAt: now,
    };
    onUpdate([...products, duplicatedProduct]);
  };

  // חישוב עלות מארז שמור
  const getProductTotalCost = (product: Product): number => {
    if (!product.components) return product.ingredientsCost || 0;
    return product.components.reduce((total, comp) => {
      const recipe = recipes.find((r) => r.id === comp.recipeId);
      if (!recipe) return total;
      const costPerUnit = getRecipeCostPerUnit(recipe, ingredients);
      return total + costPerUnit * comp.quantity;
    }, 0);
  };

  const activeProducts = products.filter((p) => p.isActive);
  const inactiveProducts = products.filter((p) => !p.isActive);

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="form-card inline-form">
      <h3>{editingId ? 'עריכת מארז' : 'בניית מארז חדש'}</h3>

      <div className="form-grid">
        <div className="form-group">
          <label>שם המארז</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="לדוגמה: מארז חגיגי"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>תיאור (אופציונלי)</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="מה כולל המארז..."
          rows={2}
        />
      </div>

      {/* הוספת רכיבים למארז */}
      <div className="form-section">
        <h4>🍰 רכיבי המארז (מתוך המתכונים)</h4>
        
        {recipes.length === 0 ? (
          <p className="warning">⚠️ יש להוסיף מתכונים קודם בדף "מתכונים"</p>
        ) : (
          <div className="component-add-row">
            <div className="autocomplete-wrapper">
              <input
                type="text"
                value={recipeSearch}
                onChange={(e) => {
                  setRecipeSearch(e.target.value);
                  setShowRecipeDropdown(true);
                  if (!e.target.value) {
                    setNewComponent({ ...newComponent, recipeId: '' });
                  }
                }}
                onFocus={() => setShowRecipeDropdown(true)}
                onBlur={() => setTimeout(() => setShowRecipeDropdown(false), 200)}
                placeholder="חפש מתכון..."
                className="autocomplete-input"
              />
              {showRecipeDropdown && (
                <ul className="autocomplete-dropdown">
                  {(recipeSearch ? filteredRecipes : recipes).map((recipe) => {
                    const costPerUnit = getRecipeCostPerUnit(recipe, ingredients);
                    return (
                      <li
                        key={recipe.id}
                        onMouseDown={(e) => { e.preventDefault(); selectRecipe(recipe); }}
                        onTouchEnd={(e) => { e.preventDefault(); selectRecipe(recipe); }}
                        className="autocomplete-item"
                      >
                        <span className="recipe-option-name">{recipe.name}</span>
                        <span className="autocomplete-hint">
                          ₪{costPerUnit.toFixed(2)} / {recipe.yieldUnit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <input
              type="number"
              min="1"
              value={newComponent.quantity}
              onChange={(e) => setNewComponent({ ...newComponent, quantity: e.target.value })}
              placeholder="כמות"
              className="quantity-input"
            />
            <span className="unit-label">
              {newComponent.recipeId ? getRecipeYieldUnit(newComponent.recipeId) : 'יחידות'}
            </span>
            <button type="button" onClick={addComponentToProduct} className="btn btn-small btn-primary">
              + הוסף
            </button>
          </div>
        )}

        {form.components.length > 0 && (
          <>
            <table className="components-table">
              <thead>
                <tr>
                  <th>מתכון</th>
                  <th>כמות</th>
                  <th>עלות ליחידה</th>
                  <th>סה"כ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.components.map((comp, index) => {
                  const recipe = recipes.find((r) => r.id === comp.recipeId);
                  const costPerUnit = recipe ? getRecipeCostPerUnit(recipe, ingredients) : 0;
                  const totalCost = costPerUnit * comp.quantity;
                  return (
                    <tr key={index}>
                      <td className="recipe-name-cell">{getRecipeName(comp.recipeId)}</td>
                      <td>
                        <div className="quantity-edit">
                          <button
                            type="button"
                            onClick={() => updateComponentQuantity(index, Math.max(1, comp.quantity - 1))}
                            className="qty-btn"
                          >
                            -
                          </button>
                          <span className="qty-value">
                            {comp.quantity} {getRecipeYieldUnit(comp.recipeId)}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateComponentQuantity(index, comp.quantity + 1)}
                            className="qty-btn"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>₪{costPerUnit.toFixed(2)}</td>
                      <td className="total-cell">₪{totalCost.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeComponentFromProduct(index)}
                          className="btn-icon"
                        >
                          ❌
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="product-cost-summary">
              <div className="cost-summary-box">
                <div className="cost-row total-cost">
                  <span>💰 עלות חומרי גלם:</span>
                  <span className="cost-value">₪{totalIngredientsCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="pricing-section">
                <h5>📊 תמחור המארז</h5>
                
                <div className="profit-buttons">
                  {SUGGESTED_PROFITS.map((profit) => (
                    <button
                      key={profit}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, profitPercent: profit.toString(), sellingPrice: '' }));
                      }}
                      className={`profit-btn ${form.profitPercent === profit.toString() ? 'active' : ''}`}
                    >
                      {profit}%
                    </button>
                  ))}
                </div>

                <div className="profit-custom">
                  <label>אחוז רווח מותאם:</label>
                  <div className="profit-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      value={form.profitPercent}
                      onChange={(e) => setForm((prev) => ({ ...prev, profitPercent: e.target.value, sellingPrice: '' }))}
                      className="profit-input"
                    />
                    <span className="percent-sign">%</span>
                  </div>
                </div>

                <div className="calculated-price">
                  <span>מחיר מומלץ:</span>
                  <span className="price-value">₪{suggestedPrice.toFixed(0)}</span>
                </div>

                <div className="manual-price">
                  <label>או הזן מחיר ידני:</label>
                  <div className="price-input-wrapper">
                    <span className="currency-sign">₪</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.sellingPrice}
                      onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                      placeholder={suggestedPrice.toFixed(0)}
                      className="price-input"
                    />
                  </div>
                  {form.sellingPrice && (
                    <div className="actual-profit-display">
                      רווח בפועל: <strong>{actualProfit.toFixed(0)}%</strong>
                      <span className={actualProfit >= 100 ? 'profit-good' : actualProfit >= 50 ? 'profit-ok' : 'profit-low'}>
                        ({actualProfit >= 100 ? '✅ מצוין' : actualProfit >= 50 ? '👍 סביר' : '⚠️ נמוך'})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          מארז פעיל (מוצג ברשימת ההזמנות)
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={form.components.length === 0}>
          {editingId ? 'עדכן מארז' : 'צור מארז'}
        </button>
        <button type="button" onClick={resetForm} className="btn btn-secondary">
          ביטול
        </button>
      </div>
    </form>
  );

  return (
    <div className="section">
      <div className="section-header">
        <h2>🎁 מארזים למכירה</h2>
        {!isAdding && !editingId && (
          <button onClick={handleAddNew} className="btn btn-primary">
            + בנה מארז חדש
          </button>
        )}
      </div>

      {isAdding && !editingId && renderForm()}

      {products.length === 0 && !isAdding ? (
        <div className="empty-state">
          <p>עדיין אין מארזים.</p>
          <p>בנה מארז חדש על בסיס המתכונים שלך!</p>
        </div>
      ) : (
        <>
          {activeProducts.length > 0 && (
            <div className="products-grid">
              {activeProducts.map((product) => (
                <div key={product.id}>
                  {editingId === product.id ? (
                    renderForm()
                  ) : (
                    <div className="product-card enhanced">
                      <div className="product-header">
                        <h3>{product.name}</h3>
                        <span className="product-price">₪{product.sellingPrice.toFixed(0)}</span>
                      </div>
                      
                      {product.description && (
                        <p className="product-description">{product.description}</p>
                      )}
                      
                      {product.components && product.components.length > 0 && (
                        <div className="product-components">
                          <h4>מכיל:</h4>
                          <ul>
                            {product.components.map((comp, idx) => (
                              <li key={idx}>
                                {comp.quantity} × {getRecipeName(comp.recipeId)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="product-pricing-info">
                        <div className="pricing-row">
                          <span>עלות חומרים:</span>
                          <span>₪{getProductTotalCost(product).toFixed(2)}</span>
                        </div>
                        <div className="pricing-row">
                          <span>מחיר לצרכן:</span>
                          <span className="consumer-price">₪{product.sellingPrice.toFixed(0)}</span>
                        </div>
                        <div className="pricing-row">
                          <span>אחוז רווח:</span>
                          <span className={`profit-badge ${
                            ((product.sellingPrice - getProductTotalCost(product)) / getProductTotalCost(product) * 100) >= 100 ? 'high' : 
                            ((product.sellingPrice - getProductTotalCost(product)) / getProductTotalCost(product) * 100) >= 50 ? 'medium' : 'low'
                          }`}>
                            {((product.sellingPrice - getProductTotalCost(product)) / getProductTotalCost(product) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="product-actions">
                        <button onClick={() => handleDuplicate(product)} className="btn btn-small">
                          📋 שכפל
                        </button>
                        <button onClick={() => handleEdit(product)} className="btn btn-small">
                          ✏️ ערוך
                        </button>
                        <button
                          onClick={() => handleToggleActive(product.id)}
                          className="btn btn-small"
                        >
                          🚫 הסתר
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="btn btn-small btn-danger"
                        >
                          🗑️ מחק
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {inactiveProducts.length > 0 && (
            <div className="inactive-products">
              <h4>מארזים מוסתרים ({inactiveProducts.length})</h4>
              <div className="products-grid inactive">
                {inactiveProducts.map((product) => (
                  <div key={product.id} className="product-card inactive">
                    <div className="product-header">
                      <h3>{product.name}</h3>
                      <span className="product-price">₪{product.sellingPrice.toFixed(0)}</span>
                    </div>
                    <div className="product-actions">
                      <button
                        onClick={() => handleToggleActive(product.id)}
                        className="btn btn-small btn-primary"
                      >
                        ✅ הפעל
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="btn btn-small btn-danger"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
