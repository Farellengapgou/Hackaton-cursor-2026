# Enregistrer une démo vidéo FinAudit (Linux)

## Outil recommandé : OBS Studio

```bash
sudo apt update && sudo apt install -y obs-studio
obs
```

### Réglages rapides

1. **Sources** → `+` → **Capture d'écran** (écran entier ou fenêtre Chrome).
2. **Paramètres** → **Sortie** → enregistrement **MP4**, qualité **Indistinguable**.
3. **Paramètres** → **Audio** → micro activé si vous parlez en direct ; sinon vous ajouterez la voix off générée par Python (voir `demo/`).
4. Résolution : **1920×1080**, 30 fps.

### Alternative légère

```bash
sudo apt install -y simplescreenrecorder
simplescreenrecorder
```

## Scénario suggéré (5–7 min)

| Étape | Durée | Action à l'écran |
|-------|-------|------------------|
| 1 | 30 s | Landing `/` → « Accéder à la plateforme » |
| 2 | 45 s | Inscription `marie_audit` / mot de passe conforme |
| 3 | 60 s | Import `backend/demo_transactions.csv` ou démo |
| 4 | 90 s | Dashboard : graphiques, clic barre → transactions |
| 5 | 60 s | Détail transaction + assistant IA (robot) |
| 6 | 60 s | Rapport d'audit → export PDF |
| 7 | 20 s | Conclusion landing ou logo |

Lisez le fichier [`demo/narration_fr.txt`](../demo/narration_fr.txt) pendant l'enregistrement, ou superposez les MP3 générés (voir ci-dessous).

## Monter voix off + vidéo (optionnel)

- **DaVinci Resolve** (gratuit) ou **Kdenlive** (`sudo apt install kdenlive`).
- Piste 1 : vidéo OBS. Piste 2 : fichiers `demo/output/audio/*.mp3` alignés sur le script.

## Voix off automatique (Python)

```bash
cd demo
pip install -r requirements-demo.txt
python generate_voiceover.py
# → fichiers dans demo/output/audio/
```

Ensuite importez ces MP3 dans votre logiciel de montage.
