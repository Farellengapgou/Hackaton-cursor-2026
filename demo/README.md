# Démo FinAudit — un seul script

Génère automatiquement :

1. **9 fichiers MP3** (voix off française, gTTS)
2. **9 slides PNG** (visuels corporate)
3. **1 vidéo** `output/FinAudit_Demo.mp4` (~6 min)

## Prérequis (une fois)

```bash
sudo apt install -y ffmpeg
```

Connexion **Internet** requise pour la synthèse vocale (Google TTS).

## Lancer

```bash
cd /home/angelasevilla/Downloads/FINAUDIT/demo
bash run_all.sh
```

Durée : environ 2 à 5 minutes selon la connexion.

## Résultat

| Fichier | Description |
|---------|-------------|
| `output/FinAudit_Demo.mp4` | Vidéo complète prête à présenter |
| `output/audio/*.mp3` | Pistes voix off séparées |
| `output/slides/*.png` | Images par section |

## Personnaliser le texte

Éditez `narration_fr.txt` (sections `[intro]`, `[landing]`, …), puis relancez `bash run_all.sh`.

## Guide utilisation (texte)

Voir [`../docs/GUIDE_UTILISATION_DEMO.md`](../docs/GUIDE_UTILISATION_DEMO.md).

## Enregistrement de l’app réelle (optionnel)

La vidéo auto utilise des **slides** (pas l’écran de l’app). Pour montrer l’interface réelle, enregistrez avec OBS en suivant le guide et utilisez `output/audio/` comme voix off.
