#!/usr/bin/env bash
# Lance l'API (Python système — import sklearn en mode paresseux si pyarrow est cassé).
set -e
cd "$(dirname "$0")"

PY="${PY:-/usr/bin/python3}"

if ! command -v "$PY" >/dev/null 2>&1; then
  echo "Python introuvable: $PY"
  exit 1
fi

echo "Python: $($PY --version) ($($PY -c 'import sys; print(sys.executable)'))"
"$PY" -m pip install -q -r requirements.txt

if ! "$PY" -c "from sklearn.ensemble import IsolationForest" 2>/dev/null; then
  echo "Réparation pyarrow (requis par scikit-learn)…"
  "$PY" -m pip install -q --user --force-reinstall 'pyarrow>=15,<19' || true
fi

echo "Démarrage: http://127.0.0.1:8000/docs"
exec "$PY" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
