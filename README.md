# 🌿 Harmony Scheduler 2.0

> Gérez vos rendez-vous avec sérénité. Prévention du burnout par IA pour professionnels indépendants.

[![Version](https://img.shields.io/badge/version-2.0.0-success)](./)
[![License](https://img.shields.io/badge/license-MIT-blue)](./)
[![WCAG](https://img.shields.io/badge/WCAG-AA-green)](./)

---

## ✨ Fonctionnalités

### 🌿 Score Harmony Avancé
- **6 dimensions d'analyse**: Charge journalière, pauses, horaires, équilibre, récupération, stress prédictif
- **Algorithm prédictif**: Anticipation des surcharges 7 jours à l'avance
- **Pondérations dynamiques**: Ajustement intelligent selon le contexte

### 🧘 Prévention du Burnout
- **Indicateur de récupération**: Recommandations personnalisées de repos
- **Détection journées critiques**: Alertes automatiques avant la surcharge
- **Suggestions de blocage**: Créneaux à bloquer intelligemment suggérés

### 📅 Gestion de Rendez-vous
- Calendrier interactif (FullCalendar)
- Pauses automatiques entre RDV
- Page de réservation client dédiée
- Export CSV

### 📊 Analytics & Insights
- Rapports hebdomadaires automatiques
- Visualisation de la charge mensuelle
- Tendances et recommandations

---

## 🚀 Démarrage Rapide

```bash
# Cloner le repository
git clone https://github.com/votre-org/harmony-scheduler.git

# Naviguer dans le dossier
cd harmony-scheduler-refactored

# Lancer avec un serveur local
npx serve .
# ou
python -m http.server 8000
```

Ouvrir [http://localhost:8000](http://localhost:8000)

---

## 🏗️ Architecture

```
js/
├── core/                    # Cœur de l'application
│   ├── Config.js           # Configuration centralisée
│   ├── HarmonyEngine.js    # Moteur d'analyse avancé
│   └── StorageManager.js   # Gestionnaire de stockage
│
├── components/             # Composants UI
│   ├── ModalSystem.js      # Système de modales
│   ├── ToastSystem.js      # Notifications toast
│   ├── ThemeManager.js     # Gestion du thème
│   └── HarmonyScoreWidget.js # Widget de score
│
├── utils/                  # Utilitaires
│   ├── DateUtils.js        # Manipulation des dates
│   ├── MathUtils.js        # Fonctions mathématiques
│   └── Validator.js        # Validation & sécurité
│
└── app.js                  # Point d'entrée

css/
├── harmony-design-system.css  # Design system
├── harmony-components.css     # Composants UI
└── harmony-pages.css          # Styles spécifiques
```

---

## 📖 Documentation

- [Architecture SaaS](./docs/ARCHITECTURE_SAAS.md) — Roadmap technique évolutive
- [Améliorations](./docs/AMELIORATIONS.md) — Rapport des améliorations v2.0

---

## 🛣️ Roadmap

### v2.1 (Prochaine)
- [ ] Tests automatisés (Jest + Cypress)
- [ ] PWA complète
- [ ] Synchronisation cloud optionnelle

### v3.0 (SaaS)
- [ ] Backend Node.js + MongoDB
- [ ] Authentification JWT
- [ ] Plans d'abonnement
- [ ] API publique

### v4.0 (Scale)
- [ ] Mobile app (React Native)
- [ ] ML avancé (TensorFlow)
- [ ] Marketplace d'intégrations

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 Licence

MIT License — voir [LICENSE](./LICENSE)

---

<p align="center">
  Fait avec 🌿 pour les professionnels indépendants
</p>
