import { useState } from 'react';
import { PricingSettings, Packaging } from '../types';

interface Props {
  settings: PricingSettings;
  packagings: Packaging[];
  onUpdateSettings: (settings: PricingSettings) => void;
  onUpdatePackagings: (packagings: Packaging[]) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  shareCode?: string | null;
  onConnectWithCode?: (code: string) => Promise<boolean>;
}

export function Settings({
  settings,
  packagings,
  onUpdateSettings,
  onUpdatePackagings,
  onExport,
  onImport,
  shareCode,
  onConnectWithCode,
}: Props) {
  const [form, setForm] = useState(settings);
  const [newPackaging, setNewPackaging] = useState({ name: '', cost: '' });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [connectCode, setConnectCode] = useState('');
  const [connectStatus, setConnectStatus] = useState<string | null>(null);

  const handleSettingsSave = () => {
    onUpdateSettings(form);
    alert('ההגדרות נשמרו בהצלחה!');
  };

  const handleAddPackaging = () => {
    if (!newPackaging.name || !newPackaging.cost) return;
    
    const newPkg: Packaging = {
      id: crypto.randomUUID(),
      name: newPackaging.name,
      cost: parseFloat(newPackaging.cost),
    };
    onUpdatePackagings([...packagings, newPkg]);
    setNewPackaging({ name: '', cost: '' });
  };

  const handleDeletePackaging = (id: string) => {
    onUpdatePackagings(packagings.filter((p) => p.id !== id));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('טוען...');
      await onImport(file);
      setImportStatus('הייבוא הושלם בהצלחה!');
      setForm(settings); // עדכון הטופס עם ההגדרות החדשות
    } catch (error) {
      setImportStatus('שגיאה בייבוא הקובץ');
    }

    // נקה את הסטטוס אחרי 3 שניות
    setTimeout(() => setImportStatus(null), 3000);
    e.target.value = '';
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>⚙️ הגדרות</h2>
      </div>

      <div className="settings-grid">
        {/* הגדרות תמחור */}
        <div className="settings-card">
          <h3>הגדרות תמחור</h3>
          
          <div className="form-group">
            <label>עלות שעת עבודה (₪)</label>
            <input
              type="number"
              step="1"
              value={form.laborCostPerHour}
              onChange={(e) => setForm({ ...form, laborCostPerHour: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>אחוז רווח רצוי (%)</label>
            <input
              type="number"
              step="1"
              value={form.profitMarginPercent}
              onChange={(e) => setForm({ ...form, profitMarginPercent: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>עלות משלוח ברירת מחדל (₪)</label>
            <input
              type="number"
              step="1"
              value={form.deliveryCost}
              onChange={(e) => setForm({ ...form, deliveryCost: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>הוצאות כלליות (חשמל, גז וכו') (%)</label>
            <input
              type="number"
              step="1"
              value={form.overheadPercent}
              onChange={(e) => setForm({ ...form, overheadPercent: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <button onClick={handleSettingsSave} className="btn btn-primary">
            שמור הגדרות
          </button>
        </div>

        {/* ניהול אריזות */}
        <div className="settings-card">
          <h3>📦 סוגי אריזה</h3>

          <div className="packaging-add">
            <input
              type="text"
              value={newPackaging.name}
              onChange={(e) => setNewPackaging({ ...newPackaging, name: e.target.value })}
              placeholder="שם האריזה"
            />
            <input
              type="number"
              step="0.01"
              value={newPackaging.cost}
              onChange={(e) => setNewPackaging({ ...newPackaging, cost: e.target.value })}
              placeholder="מחיר"
            />
            <button onClick={handleAddPackaging} className="btn btn-small">
              הוסף
            </button>
          </div>

          <ul className="packaging-list">
            {packagings.map((pkg) => (
              <li key={pkg.id}>
                <span>{pkg.name}</span>
                <span>₪{pkg.cost.toFixed(2)}</span>
                <button
                  onClick={() => handleDeletePackaging(pkg.id)}
                  className="btn-icon"
                  title="מחק"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* גיבוי ושחזור */}
        <div className="settings-card">
          <h3>💾 גיבוי ושחזור</h3>
          
          <p className="description">
            שמור את כל הנתונים שלך לקובץ או שחזר מגיבוי קודם.
            שימושי כדי להעביר נתונים בין מכשירים.
          </p>

          <div className="backup-actions">
            <button onClick={onExport} className="btn btn-secondary">
              📤 ייצוא לקובץ
            </button>
            
            <label className="btn btn-secondary file-input-label">
              📥 ייבוא מקובץ
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {importStatus && (
            <p className={`import-status ${importStatus.includes('שגיאה') ? 'error' : 'success'}`}>
              {importStatus}
            </p>
          )}
        </div>

        {/* סנכרון בין מכשירים */}
        <div className="settings-card">
          <h3>🔗 סנכרון בין מכשירים</h3>
          
          <p className="description">
            הנתונים שלך מסונכרנים אוטומטית לענן.
            כדי לחבר מכשיר נוסף, העתק את הקוד או הזן קוד ממכשיר אחר.
          </p>

          {shareCode && (
            <div className="share-code-section">
              <label>קוד הסנכרון שלך:</label>
              <div className="share-code-display">
                <code>{shareCode}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareCode);
                    alert('הקוד הועתק!');
                  }}
                  className="btn btn-small"
                >
                  📋 העתק
                </button>
              </div>
            </div>
          )}

          {onConnectWithCode && (
            <div className="connect-section">
              <label>התחברות למכשיר אחר:</label>
              <div className="connect-input">
                <input
                  type="text"
                  value={connectCode}
                  onChange={(e) => setConnectCode(e.target.value)}
                  placeholder="הדבק קוד סנכרון"
                />
                <button
                  onClick={async () => {
                    if (!connectCode.trim()) return;
                    setConnectStatus('מתחבר...');
                    const success = await onConnectWithCode(connectCode.trim());
                    if (success) {
                      setConnectStatus('התחברת בהצלחה! הנתונים מסונכרנים.');
                      setConnectCode('');
                    } else {
                      setConnectStatus('שגיאה - קוד לא תקין');
                    }
                    setTimeout(() => setConnectStatus(null), 3000);
                  }}
                  className="btn btn-primary"
                >
                  התחבר
                </button>
              </div>
              {connectStatus && (
                <p className={`import-status ${connectStatus.includes('שגיאה') ? 'error' : 'success'}`}>
                  {connectStatus}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
