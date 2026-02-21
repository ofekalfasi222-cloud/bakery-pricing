import { useState, useMemo } from 'react';
import { Order, OrderItem, Product, orderStatusLabels } from '../types';

interface Props {
  orders: Order[];
  products: Product[];
  onUpdate: (orders: Order[]) => void;
}

// מידע על לקוח
interface CustomerInfo {
  name: string;
  phone: string;
  orderCount: number;
  lastOrderDate: string;
}

export function Orders({ orders, products, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    items: [] as OrderItem[],
    packagingCost: '0',
    deliveryCost: '0',
    discount: '0',
    status: 'pending' as Order['status'],
    notes: '',
  });

  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: '1',
    customName: '',
    customPrice: '',
  });

  const [isCustomItem, setIsCustomItem] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const activeProducts = products.filter((p) => p.isActive);

  // סינון מארזים לפי חיפוש
  const filteredProducts = activeProducts.filter((prod) =>
    prod.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectProduct = (prod: Product) => {
    setNewItem({ ...newItem, productId: prod.id });
    setProductSearch(prod.name);
    setShowProductDropdown(false);
  };

  // בניית מאגר לקוחות מההזמנות הקודמות
  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerInfo>();
    
    orders.forEach((order) => {
      const existing = customerMap.get(order.customerName);
      if (existing) {
        existing.orderCount += 1;
        if (order.date > existing.lastOrderDate) {
          existing.lastOrderDate = order.date;
          if (order.customerPhone) {
            existing.phone = order.customerPhone;
          }
        }
      } else {
        customerMap.set(order.customerName, {
          name: order.customerName,
          phone: order.customerPhone || '',
          orderCount: 1,
          lastOrderDate: order.date,
        });
      }
    });
    
    // מיון לפי כמות הזמנות (לקוחות חוזרים קודם)
    return Array.from(customerMap.values()).sort((a, b) => b.orderCount - a.orderCount);
  }, [orders]);

  // סינון לקוחות לפי הקלט
  const filteredCustomers = useMemo(() => {
    if (!form.customerName) return customers;
    const search = form.customerName.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(search));
  }, [customers, form.customerName]);

  // בחירת לקוח מהרשימה
  const selectCustomer = (customer: CustomerInfo) => {
    setForm({
      ...form,
      customerName: customer.name,
      customerPhone: customer.phone,
    });
    setShowCustomerSuggestions(false);
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      items: [],
      packagingCost: '0',
      deliveryCost: '0',
      discount: '0',
      status: 'pending',
      notes: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const addItemToOrder = () => {
    const quantity = parseInt(newItem.quantity) || 1;

    if (isCustomItem) {
      // פריט מותאם אישית
      if (!newItem.customName || !newItem.customPrice) return;
      
      const price = parseFloat(newItem.customPrice);
      const item: OrderItem = {
        productId: 'custom',
        customName: newItem.customName,
        quantity,
        pricePerUnit: price,
        totalPrice: price * quantity,
      };

      setForm({
        ...form,
        items: [...form.items, item],
      });
      setNewItem({ productId: '', quantity: '1', customName: '', customPrice: '' });
      setIsCustomItem(false);
    } else {
      // פריט מהרשימה
      if (!newItem.productId) return;
      
      const product = products.find((p) => p.id === newItem.productId);
      if (!product) return;

      const item: OrderItem = {
        productId: newItem.productId,
        quantity,
        pricePerUnit: product.sellingPrice,
        totalPrice: product.sellingPrice * quantity,
      };

      setForm({
        ...form,
        items: [...form.items, item],
      });
      setNewItem({ productId: '', quantity: '1', customName: '', customPrice: '' });
      setProductSearch('');
    }
  };

  const removeItemFromOrder = (index: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    const itemsTotal = form.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const packaging = parseFloat(form.packagingCost) || 0;
    const delivery = parseFloat(form.deliveryCost) || 0;
    const discount = parseFloat(form.discount) || 0;
    return itemsTotal + packaging + delivery - discount;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const totalAmount = calculateTotal();

    if (editingId) {
      onUpdate(
        orders.map((ord) =>
          ord.id === editingId
            ? {
                ...ord,
                date: form.date,
                customerName: form.customerName,
                customerPhone: form.customerPhone,
                items: form.items,
                packagingCost: parseFloat(form.packagingCost) || 0,
                deliveryCost: parseFloat(form.deliveryCost) || 0,
                discount: parseFloat(form.discount) || 0,
                totalAmount,
                status: form.status,
                notes: form.notes,
                updatedAt: now,
              }
            : ord
        )
      );
    } else {
      const newOrder: Order = {
        id: crypto.randomUUID(),
        date: form.date,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        items: form.items,
        packagingCost: parseFloat(form.packagingCost) || 0,
        deliveryCost: parseFloat(form.deliveryCost) || 0,
        discount: parseFloat(form.discount) || 0,
        totalAmount,
        status: form.status,
        notes: form.notes,
        createdAt: now,
        updatedAt: now,
      };
      onUpdate([newOrder, ...orders]);
    }
    resetForm();
  };

  const handleEdit = (order: Order) => {
    setForm({
      date: order.date,
      customerName: order.customerName,
      customerPhone: order.customerPhone || '',
      items: [...order.items],
      packagingCost: order.packagingCost.toString(),
      deliveryCost: order.deliveryCost.toString(),
      discount: order.discount.toString(),
      status: order.status,
      notes: order.notes || '',
    });
    setEditingId(order.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('למחוק את ההזמנה?')) {
      onUpdate(orders.filter((ord) => ord.id !== id));
    }
  };

  const handleStatusChange = (id: string, status: Order['status']) => {
    onUpdate(
      orders.map((ord) =>
        ord.id === id ? { ...ord, status, updatedAt: Date.now() } : ord
      )
    );
  };

  const getProductName = (item: OrderItem) => {
    if (item.productId === 'custom' && item.customName) {
      return item.customName;
    }
    return products.find((p) => p.id === item.productId)?.name || 'מוצר לא נמצא';
  };

  // מיון לפי תאריך (חדש קודם)
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="section">
      <div className="section-header">
        <h2>📋 הזמנות</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            + הזמנה חדשה
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingId ? 'עריכת הזמנה' : 'הזמנה חדשה'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>תאריך</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group customer-input-group">
              <label>שם הלקוח</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => {
                  setForm({ ...form, customerName: e.target.value });
                  setShowCustomerSuggestions(true);
                }}
                onFocus={() => setShowCustomerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                placeholder="הקלד שם או בחר מהרשימה"
                autoComplete="off"
                required
              />
              {showCustomerSuggestions && filteredCustomers.length > 0 && (
                <ul className="customer-suggestions">
                  {filteredCustomers.map((customer) => (
                    <li
                      key={customer.name}
                      onMouseDown={(e) => { e.preventDefault(); selectCustomer(customer); }}
                      onTouchEnd={(e) => { e.preventDefault(); selectCustomer(customer); }}
                      className="customer-suggestion"
                    >
                      <span className="customer-name">{customer.name}</span>
                      <span className="customer-meta">
                        {customer.orderCount} הזמנות
                        {customer.phone && ` | ${customer.phone}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group">
              <label>טלפון (אופציונלי)</label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="050-0000000"
              />
            </div>

            <div className="form-group">
              <label>סטטוס</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Order['status'] })}
              >
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* הוספת פריטים */}
          <div className="form-section">
            <h4>פריטים בהזמנה</h4>

            <div className="order-item-add">
                <div className="item-type-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${!isCustomItem ? 'active' : ''}`}
                    onClick={() => setIsCustomItem(false)}
                  >
                    מארז קיים
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${isCustomItem ? 'active' : ''}`}
                    onClick={() => setIsCustomItem(true)}
                  >
                    אחר (מותאם)
                  </button>
                </div>

                {isCustomItem ? (
                  <div className="custom-item-inputs">
                    <input
                      type="text"
                      value={newItem.customName}
                      onChange={(e) => setNewItem({ ...newItem, customName: e.target.value })}
                      placeholder="שם הפריט..."
                    />
                    <input
                      type="number"
                      step="1"
                      value={newItem.customPrice}
                      onChange={(e) => setNewItem({ ...newItem, customPrice: e.target.value })}
                      placeholder="מחיר ₪"
                    />
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      placeholder="כמות"
                      style={{ width: '80px' }}
                    />
                    <button type="button" onClick={addItemToOrder} className="btn btn-small">
                      הוסף
                    </button>
                  </div>
                ) : activeProducts.length === 0 ? (
                  <p className="warning">⚠️ יש להוסיף מארזים קודם (בטאב "מארזים")</p>
                ) : (
                  <div className="product-item-inputs">
                    <div className="autocomplete-wrapper">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          if (!e.target.value) {
                            setNewItem({ ...newItem, productId: '' });
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                        placeholder="הקלד לחיפוש מארז..."
                        className="autocomplete-input"
                      />
                      {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                        <ul className="autocomplete-dropdown">
                          {filteredProducts.map((prod) => (
                            <li
                              key={prod.id}
                              onMouseDown={(e) => { e.preventDefault(); selectProduct(prod); }}
                              onTouchEnd={(e) => { e.preventDefault(); selectProduct(prod); }}
                              className="autocomplete-item"
                            >
                              {prod.name}
                              <span className="autocomplete-hint">₪{prod.sellingPrice}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {showProductDropdown && !productSearch && (
                        <ul className="autocomplete-dropdown">
                          {activeProducts.map((prod) => (
                            <li
                              key={prod.id}
                              onMouseDown={(e) => { e.preventDefault(); selectProduct(prod); }}
                              onTouchEnd={(e) => { e.preventDefault(); selectProduct(prod); }}
                              className="autocomplete-item"
                            >
                              {prod.name}
                              <span className="autocomplete-hint">₪{prod.sellingPrice}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      placeholder="כמות"
                    />
                    <button type="button" onClick={addItemToOrder} className="btn btn-small">
                      הוסף
                    </button>
                  </div>
                )}
              </div>

            {form.items.length > 0 && (
              <ul className="order-items-list">
                {form.items.map((item, index) => (
                  <li key={index}>
                    <span className="item-name">
                      {getProductName(item)}
                      {item.productId === 'custom' && <span className="custom-badge">אחר</span>}
                    </span>
                    <span className="item-qty">x{item.quantity}</span>
                    <span className="item-price">₪{item.totalPrice}</span>
                    <button
                      type="button"
                      onClick={() => removeItemFromOrder(index)}
                      className="btn-icon"
                    >
                      ❌
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* עלויות נוספות */}
          <div className="form-grid">
            <div className="form-group">
              <label>עלות אריזה (₪)</label>
              <input
                type="number"
                step="1"
                value={form.packagingCost}
                onChange={(e) => setForm({ ...form, packagingCost: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>עלות משלוח (₪)</label>
              <input
                type="number"
                step="1"
                value={form.deliveryCost}
                onChange={(e) => setForm({ ...form, deliveryCost: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>הנחה (₪)</label>
              <input
                type="number"
                step="1"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>הערות (אופציונלי)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="הערות להזמנה..."
              rows={2}
            />
          </div>

          {form.items.length > 0 && (
            <div className="order-total">
              <strong>סה"כ לתשלום: ₪{calculateTotal()}</strong>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'עדכן' : 'צור הזמנה'}
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              ביטול
            </button>
          </div>
        </form>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>עדיין אין הזמנות. צור את ההזמנה הראשונה!</p>
        </div>
      ) : (
        <div className="orders-list">
          {sortedOrders.map((order) => (
            <div key={order.id} className={`order-card status-${order.status}`}>
              <div className="order-header">
                <div className="order-info">
                  <span className="order-date">
                    {new Date(order.date).toLocaleDateString('he-IL')}
                  </span>
                  <h3 className="order-customer">{order.customerName}</h3>
                  {order.customerPhone && (
                    <span className="order-phone">{order.customerPhone}</span>
                  )}
                </div>
                <div className="order-status-price">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value as Order['status'])
                    }
                    className={`status-select status-${order.status}`}
                  >
                    {Object.entries(orderStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="order-total">₪{order.totalAmount}</span>
                </div>
              </div>

              <div className="order-items">
                {order.items.map((item, index) => (
                  <span key={index} className={`order-item-badge ${item.productId === 'custom' ? 'custom' : ''}`}>
                    {getProductName(item)} x{item.quantity}
                  </span>
                ))}
              </div>

              {order.notes && <p className="order-notes">{order.notes}</p>}

              <div className="order-actions">
                <button onClick={() => handleEdit(order)} className="btn btn-small">
                  ✏️ ערוך
                </button>
                <button
                  onClick={() => handleDelete(order.id)}
                  className="btn btn-small btn-danger"
                >
                  🗑️ מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
