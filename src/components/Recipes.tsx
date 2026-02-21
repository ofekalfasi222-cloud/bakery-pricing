import { useState, useMemo } from 'react';
import {
  Recipe,
  Ingredient,
  RecipeIngredient,
  Unit,
  unitLabels,
  categoryLabels,
} from '../types';

interface Props {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onUpdate: (recipes: Recipe[]) => void;
}

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

// חישוב עלות חומר גלם בודד
function calculateIngredientCost(
  recipeIng: RecipeIngredient,
  ingredientsList: Ingredient[]
): number {
  const ingredient = ingredientsList.find((i) => i.id === recipeIng.ingredientId);
  if (!ingredient) return 0;
  
  const convertedQty = convertToBaseUnit(
    recipeIng.quantity,
    recipeIng.unit,
    ingredient.unit
  );
  return convertedQty * ingredient.pricePerUnit;
}

export function Recipes({ recipes, ingredients, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'cake' as Recipe['category'],
    yield: '1',
    yieldUnit: 'יחידות',
    laborMinutes: '30',
    notes: '',
    ingredients: [] as RecipeIngredient[],
  });

  const [newIngredient, setNewIngredient] = useState({
    ingredientId: '',
    quantity: '',
    unit: 'g' as Unit,
  });

  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);

  // סינון חומרי גלם לפי חיפוש
  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const selectIngredient = (ing: Ingredient) => {
    setNewIngredient({ ...newIngredient, ingredientId: ing.id });
    setIngredientSearch(ing.name);
    setShowIngredientDropdown(false);
  };

  const resetForm = () => {
    setForm({
      name: '',
      category: 'cake',
      yield: '1',
      yieldUnit: 'יחידות',
      laborMinutes: '30',
      notes: '',
      ingredients: [],
    });
    setIsAdding(false);
    setEditingId(null);
    setIngredientSearch('');
  };

  const addIngredientToRecipe = () => {
    if (!newIngredient.ingredientId || !newIngredient.quantity) return;
    
    setForm({
      ...form,
      ingredients: [
        ...form.ingredients,
        {
          ingredientId: newIngredient.ingredientId,
          quantity: parseFloat(newIngredient.quantity),
          unit: newIngredient.unit,
        },
      ],
    });
    setNewIngredient({ ingredientId: '', quantity: '', unit: 'g' });
    setIngredientSearch('');
  };

  const removeIngredientFromRecipe = (index: number) => {
    setForm({
      ...form,
      ingredients: form.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();

    if (editingId) {
      onUpdate(
        recipes.map((rec) =>
          rec.id === editingId
            ? {
                ...rec,
                name: form.name,
                category: form.category,
                yield: parseInt(form.yield),
                yieldUnit: form.yieldUnit,
                laborMinutes: parseInt(form.laborMinutes),
                notes: form.notes,
                ingredients: form.ingredients,
                updatedAt: now,
              }
            : rec
        )
      );
    } else {
      const newRecipe: Recipe = {
        id: crypto.randomUUID(),
        name: form.name,
        category: form.category,
        yield: parseInt(form.yield),
        yieldUnit: form.yieldUnit,
        laborMinutes: parseInt(form.laborMinutes),
        notes: form.notes,
        ingredients: form.ingredients,
        createdAt: now,
        updatedAt: now,
      };
      onUpdate([...recipes, newRecipe]);
    }
    resetForm();
  };

  const handleEdit = (recipe: Recipe) => {
    setForm({
      name: recipe.name,
      category: recipe.category,
      yield: recipe.yield.toString(),
      yieldUnit: recipe.yieldUnit,
      laborMinutes: recipe.laborMinutes.toString(),
      notes: recipe.notes || '',
      ingredients: [...recipe.ingredients],
    });
    setEditingId(recipe.id);
    setIsAdding(true);
    // גלילה למעלה לטופס
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm('למחוק את המתכון?')) {
      onUpdate(recipes.filter((rec) => rec.id !== id));
    }
  };

  const handleDuplicate = (recipe: Recipe) => {
    const now = Date.now();
    const duplicatedRecipe: Recipe = {
      ...recipe,
      id: crypto.randomUUID(),
      name: `${recipe.name} (עותק)`,
      ingredients: [...recipe.ingredients],
      createdAt: now,
      updatedAt: now,
    };
    onUpdate([...recipes, duplicatedRecipe]);
  };

  const getIngredientName = (id: string) => {
    const ing = ingredients.find((i) => i.id === id);
    return ing?.name || 'לא נמצא';
  };

  // חישוב עלות כוללת של חומרי הגלם בטופס
  const totalIngredientsCost = useMemo(() => {
    return form.ingredients.reduce((total, ing) => {
      return total + calculateIngredientCost(ing, ingredients);
    }, 0);
  }, [form.ingredients, ingredients]);

  // חישוב עלות ליחידה
  const costPerUnit = useMemo(() => {
    const yieldNum = parseInt(form.yield) || 1;
    return totalIngredientsCost / yieldNum;
  }, [totalIngredientsCost, form.yield]);

  // חישוב עלות למתכון שמור
  const getRecipeTotalCost = (recipe: Recipe) => {
    return recipe.ingredients.reduce((total, ing) => {
      return total + calculateIngredientCost(ing, ingredients);
    }, 0);
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>📖 מתכונים</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            + הוסף מתכון
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingId ? 'עריכת מתכון' : 'הוספת מתכון חדש'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>שם המתכון</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="לדוגמה: עוגת שוקולד"
                required
              />
            </div>

            <div className="form-group">
              <label>קטגוריה</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Recipe['category'] })}
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>תפוקה (כמות)</label>
              <input
                type="number"
                min="1"
                value={form.yield}
                onChange={(e) => setForm({ ...form, yield: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>יחידת תפוקה</label>
              <input
                type="text"
                value={form.yieldUnit}
                onChange={(e) => setForm({ ...form, yieldUnit: e.target.value })}
                placeholder="יחידות / פרוסות / עוגות"
              />
            </div>

            <div className="form-group">
              <label>זמן עבודה (דקות)</label>
              <input
                type="number"
                min="0"
                value={form.laborMinutes}
                onChange={(e) => setForm({ ...form, laborMinutes: e.target.value })}
              />
            </div>
          </div>

          {/* הוספת חומרי גלם למתכון */}
          <div className="form-section">
            <h4>חומרי גלם במתכון</h4>
            
            {ingredients.length === 0 ? (
              <p className="warning">⚠️ יש להוסיף חומרי גלם קודם</p>
            ) : (
              <div className="ingredient-add-row">
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    value={ingredientSearch}
                    onChange={(e) => {
                      setIngredientSearch(e.target.value);
                      setShowIngredientDropdown(true);
                      if (!e.target.value) {
                        setNewIngredient({ ...newIngredient, ingredientId: '' });
                      }
                    }}
                    onFocus={() => setShowIngredientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowIngredientDropdown(false), 200)}
                    placeholder="הקלד לחיפוש חומר גלם..."
                    className="autocomplete-input"
                  />
                  {showIngredientDropdown && ingredientSearch && filteredIngredients.length > 0 && (
                    <ul className="autocomplete-dropdown">
                      {filteredIngredients.map((ing) => (
                        <li
                          key={ing.id}
                          onMouseDown={(e) => { e.preventDefault(); selectIngredient(ing); }}
                          onTouchEnd={(e) => { e.preventDefault(); selectIngredient(ing); }}
                          className="autocomplete-item"
                        >
                          {ing.name}
                          <span className="autocomplete-hint">
                            ₪{ing.pricePerUnit.toFixed(2)}/{unitLabels[ing.unit]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {showIngredientDropdown && !ingredientSearch && (
                    <ul className="autocomplete-dropdown">
                      {ingredients.map((ing) => (
                        <li
                          key={ing.id}
                          onMouseDown={(e) => { e.preventDefault(); selectIngredient(ing); }}
                          onTouchEnd={(e) => { e.preventDefault(); selectIngredient(ing); }}
                          className="autocomplete-item"
                        >
                          {ing.name}
                          <span className="autocomplete-hint">
                            ₪{ing.pricePerUnit.toFixed(2)}/{unitLabels[ing.unit]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  placeholder="כמות"
                />
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as Unit })}
                >
                  {Object.entries(unitLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addIngredientToRecipe} className="btn btn-small">
                  הוסף
                </button>
              </div>
            )}

            {form.ingredients.length > 0 && (
              <>
                <table className="ingredients-table">
                  <thead>
                    <tr>
                      <th>חומר גלם</th>
                      <th>כמות</th>
                      <th>עלות</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.ingredients.map((ing, index) => {
                      const cost = calculateIngredientCost(ing, ingredients);
                      return (
                        <tr key={index}>
                          <td>{getIngredientName(ing.ingredientId)}</td>
                          <td>{ing.quantity} {unitLabels[ing.unit]}</td>
                          <td>₪{cost.toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => removeIngredientFromRecipe(index)}
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
                
                <div className="cost-summary">
                  <div className="cost-summary-row">
                    <span>סה"כ עלות חומרי גלם:</span>
                    <span className="cost-value">₪{totalIngredientsCost.toFixed(2)}</span>
                  </div>
                  {parseInt(form.yield) > 1 && (
                    <div className="cost-summary-row highlight">
                      <span>עלות ל{form.yieldUnit || 'יחידה'}:</span>
                      <span className="cost-value">₪{costPerUnit.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label>הערות (אופציונלי)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="הערות נוספות..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'עדכן' : 'הוסף'}
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              ביטול
            </button>
          </div>
        </form>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>עדיין אין מתכונים. הוסף את המתכון הראשון שלך!</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map((recipe) => {
            const totalCost = getRecipeTotalCost(recipe);
            const perUnitCost = totalCost / recipe.yield;
            return (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-header">
                  <h3>{recipe.name}</h3>
                  <span className="category-badge">{categoryLabels[recipe.category]}</span>
                </div>
                <div className="recipe-info">
                  <p>
                    <strong>תפוקה:</strong> {recipe.yield} {recipe.yieldUnit}
                  </p>
                  <p>
                    <strong>זמן עבודה:</strong> {recipe.laborMinutes} דקות
                  </p>
                  <p>
                    <strong>חומרים:</strong> {recipe.ingredients.length}
                  </p>
                </div>
                <div className="recipe-cost-display">
                  <div className="cost-line">
                    <span>עלות חומרים:</span>
                    <span className="cost-amount">₪{totalCost.toFixed(2)}</span>
                  </div>
                  {recipe.yield > 1 && (
                    <div className="cost-line per-unit">
                      <span>עלות ל{recipe.yieldUnit}:</span>
                      <span className="cost-amount">₪{perUnitCost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="recipe-actions">
                  <button onClick={() => handleDuplicate(recipe)} className="btn btn-small">
                    📋 שכפל
                  </button>
                  <button onClick={() => handleEdit(recipe)} className="btn btn-small">
                    ✏️ ערוך
                  </button>
                  <button onClick={() => handleDelete(recipe.id)} className="btn btn-small btn-danger">
                    🗑️ מחק
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
