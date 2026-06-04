# Guide d'utilisation FinAudit (démo)

Guide pas à pas pour une présentation ou un enregistrement vidéo.

## Prérequis

```bash
# Terminal 1 — API
cd backend && ./run.sh

# Terminal 2 — Interface
cd web && npm run dev
```

- Front : http://localhost:5173  
- API : http://localhost:8000/docs  
- Compte test : identifiant `marie_audit`, mot de passe `FinAudit2026`  
- Fichier démo : `backend/demo_transactions.csv` (généré par `python3 generate_demo_data.py`)

---

## 1. Découverte (landing)

1. Ouvrir http://localhost:5173/
2. Parcourir **À propos**, **Fonctionnalités**, **Confiance** (scroll).
3. Cliquer **Accéder à la plateforme**.

## 2. Créer un compte

1. **S'inscrire** si besoin.
2. **Identifiant de connexion** : `marie_audit` (pas un e-mail).
3. **Mot de passe** : `FinAudit2026` (8+ car., majuscule, minuscule, chiffre).
4. Valider → redirection tableau de bord.

## 3. Importer des données

1. Sur le dashboard, glisser-déposer `demo_transactions.csv` (ou **Charger les données de démonstration**).
2. Vérifier le bandeau : nom du fichier, nombre de lignes.
3. Consulter les **cartes KPI** et les **graphiques**.

## 4. Explorer les anomalies

1. Cliquer une **barre** du graphique « Répartition des anomalies » → page Transactions filtrée.
2. Cliquer une ligne → panneau détail (signaux + explication).
3. **Analyser** ou bouton robot en bas à droite → assistant IA.
4. Poser une question : *« Dois-je bloquer ce paiement ? »*

## 5. Rapport d'audit

1. Menu **Rapport d'audit**.
2. Lire la **conclusion** et les **transactions prioritaires**.
3. **Exporter PDF** (portrait ou paysage).

## 6. Déconnexion

Menu latéral → déconnexion.

---

## Voix off automatique

```bash
cd demo
pip install -r requirements-demo.txt
python generate_voiceover.py
```

Fichiers : `demo/output/audio/01_intro.mp3`, etc.

## Enregistrement écran

Voir [ENREGISTREMENT_VIDEO.md](ENREGISTREMENT_VIDEO.md).

---

## Dépannage rapide

| Problème | Solution |
|----------|----------|
| Port 8000 occupé | `fuser -k 8000/tcp` puis `./run.sh` |
| Assistant « règles locales » | Ajouter `GEMINI_API_KEY` dans `backend/.env` |
| Import échoue | Se connecter, backend démarré |
