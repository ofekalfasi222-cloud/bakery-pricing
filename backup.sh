#!/bin/bash

# סקריפט גיבוי לנתוני הקונדיטוריה
# הרץ: ./backup.sh

API_KEY='$2a$10$oZfLFV8vjYJgPdjv3gZK9O5OD2tUEsH30F7mZMQh4CDJqtrN3qIfq'
BIN_ID='697fcf97ae596e708f09e8ba'
BACKUP_DIR="$HOME/Documents/bakery-backups"

# יצירת תיקיית גיבויים אם לא קיימת
mkdir -p "$BACKUP_DIR"

# תאריך לשם הקובץ
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/bakery-backup-$DATE.json"

echo "🔄 מוריד נתונים מהענן..."

# הורדת הנתונים
curl -s "https://api.jsonbin.io/v3/b/$BIN_ID/latest" \
  -H "X-Master-Key: $API_KEY" | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data.get('record', {}), indent=2, ensure_ascii=False))" \
  > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
  echo "✅ גיבוי נשמר בהצלחה!"
  echo ""
  echo "📁 קובץ: $BACKUP_FILE"
  echo "📊 גודל: $(du -h "$BACKUP_FILE" | cut -f1)"
  echo ""
  
  # ספירת נתונים
  INGREDIENTS=$(grep -o '"name"' "$BACKUP_FILE" | wc -l | tr -d ' ')
  echo "📦 חומרי גלם: $INGREDIENTS"
  echo ""
  echo "🗂️  גיבויים אחרונים:"
  ls -t "$BACKUP_DIR"/*.json 2>/dev/null | head -5
else
  echo "❌ שגיאה בגיבוי"
  rm -f "$BACKUP_FILE"
  exit 1
fi
