import { useMemo, useState } from 'react';
import { Order, OrderItem, Product } from '../types';

interface Props {
  orders: Order[];
  products: Product[];
}

export function Reports({ orders, products }: Props) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  // רשימת לקוחות ייחודיים
  const uniqueCustomers = useMemo(() => {
    const customers = new Set<string>();
    orders.forEach((order) => customers.add(order.customerName));
    return Array.from(customers).sort();
  }, [orders]);

  // סינון הזמנות לפי כל הפילטרים
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status === 'cancelled') return false;
      
      // פילטר חודש
      if (selectedMonth !== 'all') {
        const orderMonth = order.date.substring(0, 7);
        if (orderMonth !== selectedMonth) return false;
      }
      
      // פילטר לקוח
      if (selectedCustomer !== 'all') {
        if (order.customerName !== selectedCustomer) return false;
      }
      
      // פילטר מוצר
      if (selectedProduct !== 'all') {
        const hasProduct = order.items.some((item) => item.productId === selectedProduct);
        if (!hasProduct) return false;
      }
      
      return true;
    });
  }, [orders, selectedMonth, selectedCustomer, selectedProduct]);

  // סטטיסטיקות כלליות (כל הזמן)
  const allTimeStats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    return {
      totalRevenue: validOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalOrders: validOrders.length,
      deliveredOrders: validOrders.filter((o) => o.status === 'delivered').length,
    };
  }, [orders]);

  // חישוב סטטיסטיקות לפי הפילטרים
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = filteredOrders.length;
    const deliveredOrders = filteredOrders.filter((o) => o.status === 'delivered').length;

    // פילוח לפי מוצר
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const itemKey = item.productId === 'custom' ? `custom_${item.customName}` : item.productId;
        if (!productStats[itemKey]) {
          let name = 'לא ידוע';
          if (item.productId === 'custom' && item.customName) {
            name = `${item.customName} (מותאם)`;
          } else {
            const product = products.find((p) => p.id === item.productId);
            name = product?.name || 'לא ידוע';
          }
          productStats[itemKey] = {
            name,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[itemKey].quantity += item.quantity;
        productStats[itemKey].revenue += item.totalPrice;
      });
    });

    // פילוח לפי לקוח
    const customerStats: Record<string, { orders: number; revenue: number }> = {};
    filteredOrders.forEach((order) => {
      if (!customerStats[order.customerName]) {
        customerStats[order.customerName] = { orders: 0, revenue: 0 };
      }
      customerStats[order.customerName].orders += 1;
      customerStats[order.customerName].revenue += order.totalAmount;
    });

    // מיון
    const topProducts = Object.entries(productStats)
      .sort((a, b) => b[1].quantity - a[1].quantity);

    const topCustomers = Object.entries(customerStats)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    return {
      totalRevenue,
      totalOrders,
      deliveredOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      topProducts,
      topCustomers,
    };
  }, [filteredOrders, products]);

  // רשימת חודשים זמינים
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    orders.forEach((order) => {
      months.add(order.date.substring(0, 7));
    });
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(months).sort().reverse();
  }, [orders]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedCustomer('all');
    setSelectedProduct('all');
  };

  const hasFilters = selectedMonth !== 'all' || selectedCustomer !== 'all' || selectedProduct !== 'all';

  return (
    <div className="section">
      <div className="section-header">
        <h2>📊 דוחות</h2>
      </div>

      {/* סיכום כללי - תמיד מוצג */}
      <div className="all-time-summary">
        <h3>📈 סיכום כולל</h3>
        <div className="summary-row">
          <span className="summary-item">
            <strong>₪{allTimeStats.totalRevenue.toLocaleString()}</strong>
            <small>סה"כ הכנסות</small>
          </span>
          <span className="summary-item">
            <strong>{allTimeStats.totalOrders}</strong>
            <small>הזמנות</small>
          </span>
          <span className="summary-item">
            <strong>{allTimeStats.deliveredOrders}</strong>
            <small>נמסרו</small>
          </span>
        </div>
      </div>

      {/* פילטרים */}
      <div className="filters-section">
        <h4>🔍 סינון</h4>
        <div className="filters-row">
          <div className="filter-group">
            <label>חודש</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">כל הזמנים</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>לקוח</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="all">כל הלקוחות</option>
              {uniqueCustomers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>מארז</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="all">כל המארזים</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="btn btn-small">
              ✕ נקה פילטרים
            </button>
          )}
        </div>
      </div>

      {/* סיכום מסונן */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-content">
            <span className="stat-value">₪{stats.totalRevenue.toLocaleString()}</span>
            <span className="stat-label">סה"כ הכנסות</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-content">
            <span className="stat-value">{stats.totalOrders}</span>
            <span className="stat-label">הזמנות</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-content">
            <span className="stat-value">{stats.deliveredOrders}</span>
            <span className="stat-label">נמסרו</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📈</span>
          <div className="stat-content">
            <span className="stat-value">₪{stats.averageOrderValue.toFixed(0)}</span>
            <span className="stat-label">ממוצע להזמנה</span>
          </div>
        </div>
      </div>

      <div className="reports-grid">
        {/* מוצרים מובילים */}
        <div className="report-card">
          <h3>🏆 מארזים {hasFilters ? '(מסונן)' : ''}</h3>
          {stats.topProducts.length === 0 ? (
            <p className="no-data">אין נתונים</p>
          ) : (
            <ul className="top-list">
              {stats.topProducts.map(([id, data], index) => (
                <li key={id}>
                  <span className="rank">{index + 1}</span>
                  <span className="name">{data.name}</span>
                  <span className="value">{data.quantity} יח' | ₪{data.revenue.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* לקוחות מובילים */}
        <div className="report-card">
          <h3>👑 לקוחות {hasFilters ? '(מסונן)' : ''}</h3>
          {stats.topCustomers.length === 0 ? (
            <p className="no-data">אין נתונים</p>
          ) : (
            <ul className="top-list">
              {stats.topCustomers.map(([name, data], index) => (
                <li key={name}>
                  <span className="rank">{index + 1}</span>
                  <span className="name">{name}</span>
                  <span className="value">{data.orders} הזמנות | ₪{data.revenue.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* רשימת הזמנות */}
      <div className="report-card full-width">
        <h3>📋 הזמנות {hasFilters ? '(מסונן)' : ''} ({filteredOrders.length})</h3>
        {filteredOrders.length === 0 ? (
          <p className="no-data">אין הזמנות להצגה</p>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>לקוח</th>
                  <th>פריטים</th>
                  <th>סה"כ</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{new Date(order.date).toLocaleDateString('he-IL')}</td>
                    <td>{order.customerName}</td>
                    <td>
                      {order.items.map((item) => {
                        if (item.productId === 'custom' && item.customName) {
                          return `${item.customName} x${item.quantity}`;
                        }
                        const product = products.find((p) => p.id === item.productId);
                        return `${product?.name || '?'} x${item.quantity}`;
                      }).join(', ')}
                    </td>
                    <td>₪{order.totalAmount}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status === 'pending' && 'ממתין'}
                        {order.status === 'preparing' && 'בהכנה'}
                        {order.status === 'ready' && 'מוכן'}
                        {order.status === 'delivered' && 'נמסר'}
                        {order.status === 'cancelled' && 'בוטל'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
