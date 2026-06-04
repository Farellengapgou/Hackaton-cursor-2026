# Speech de présentation FinAudit (~5 min)

## Accroche (30 s)

« Bonjour. Nous présentons **FinAudit**, une plateforme d'audit financier qui aide les cabinets et les PME à **détecter les anomalies** dans leurs flux de transactions, à **comprendre pourquoi** une ligne est suspecte, et à **produire un rapport** prêt pour le client ou le comité. »

## Problème (45 s)

« Aujourd'hui, l'auditeur reçoit un export Excel de centaines ou milliers de lignes. Les contrôles manuels prennent du temps, les montants atypiques passent inaperçus, et expliquer une alerte à un client demande encore beaucoup de saisie. FinAudit automatise la **première passe** : règles métier + statistiques + assistant, sans remplacer le jugement professionnel. »

## Démo live — parcours (2 min 30)

Suivre cet ordre à l'écran :

1. **Landing** — « Interface sobre, orientée métier, pas une démo gadget. »
2. **Connexion** — `marie_audit` / mot de passe démo. « Identifiant simple, pas d'e-mail obligatoire. »
3. **Import CSV** — `demo_transactions.csv`. « En quelques secondes : doublons, montants aberrants, heures inhabituelles, Benford sur le fichier. »
4. **Dashboard** — « Score de risque global, graphiques **cliquables** qui filtrent les transactions. »
5. **Transactions** — cliquer une ligne critique. « Détail : montant en FCFA, signaux, score. »
6. **Assistant** — question : *« Faut-il bloquer ce paiement ? »*  
   « Réponse structurée : **Réponse / Faits / Action**, basée sur les données importées, enrichie par Gemini si configuré. »
7. **Rapport** — « Synthèse + export PDF portrait ou paysage pour le dossier client. »

## Technique (45 s)

« Stack : **React + FastAPI**, détection locale **sans envoyer le fichier** à un cloud tiers pour l'analyse des règles. L'IA n'intervient que pour **expliquer et dialoguer** sur une transaction déjà analysée. Données **isolées par utilisateur** en session. Déploiement **Docker** en une commande pour la démo ou la production. »

## Valeur / différenciation (30 s)

| Avant | Avec FinAudit |
|-------|----------------|
| Tri manuel Excel | Priorisation automatique par score |
| Alertes floues | Règles nommées + raison en français |
| Note libre | Assistant + rapport PDF |

## Clôture (20 s)

« **FinAudit : détecter, analyser, protéger.** Nous sommes prêts pour un pilote sur vos propres exports CSV. Merci — questions ? »

---

## Questions fréquentes du jury

**« C'est de la fraude garantie ? »**  
Non : ce sont des **signaux** à investiguer, pas des preuves judiciaires.

**« Les données partent où ? »**  
Analyse des règles en local sur le serveur ; seul le **contexte d'une transaction** peut être envoyé à Gemini si la clé est activée.

**« Et demain ? »**  
Persistance base de données, export Excel, règles configurables par cabinet.

---

## Compte démo

- Identifiant : `marie_audit`
- Mot de passe : `FinAudit2026`
- Fichier : `backend/demo_transactions.csv`
