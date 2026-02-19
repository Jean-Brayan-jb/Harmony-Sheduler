# Harmony Scheduler 2.0 — Architecture SaaS Évolutive

## Vue d'ensemble

Ce document décrit l'architecture évolutive de Harmony Scheduler vers une solution SaaS multi-utilisateurs scalable avec backend Node.js, MongoDB et authentification JWT.

---

## 🏗️ Architecture Cible

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │  Mobile App │  │   PWA       │  │  Desktop    │        │
│  │  (React)    │  │(React Native│  │             │  │  (Electron) │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         └─────────────────┴─────────────────┴─────────────────┘              │
│                                    │                                         │
│                              WebSocket ( temps réel )                       │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              API GATEWAY                                     │
│  ┌─────────────────────────────────┼────────────────────────────────────┐   │
│  │         Kong / Nginx            │                                    │   │
│  │    (Rate Limiting, SSL, Cache)  │                                    │   │
│  └─────────────────────────────────┼────────────────────────────────────┘   │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         MICROSERVICES (Node.js)                              │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │  Calendar    │  │  Analytics   │  │ Notification │     │
│  │   Service    │  │   Service    │  │   Service    │  │   Service    │     │
│  │              │  │              │  │              │  │              │     │
│  │ • JWT/OAuth2 │  │ • CRUD RDV   │  │ • Scores     │  │ • Email      │     │
│  │ • 2FA        │  │ • Dispo      │  │ • Rapports   │  │ • Push       │     │
│  │ • Sessions   │  │ • Conflits   │  │ • Prédictions│  │ • SMS        │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                 │              │
│         └─────────────────┴─────────────────┴─────────────────┘              │
│                                    │                                         │
│                         Message Queue (Redis/RabbitMQ)                       │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              DATA LAYER                                      │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MongoDB (Primary Database)                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │    │
│  │  │   Users     │  │   Events    │  │  Analytics  │  │  Settings  │ │    │
│  │  │   Collection│  │  Collection │  │  Collection │  │ Collection │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │    │
│  │                                                                     │    │
│  │  • Sharding par tenant_id                                           │    │
│  │  • Replica Set (3 nodes)                                            │    │
│  │  • Backup quotidien                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Redis (Cache & Sessions)                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │   Sessions  │  │    Cache    │  │ Rate Limit  │                  │    │
│  │  │   Store     │  │   Layer     │  │   Counter   │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet Backend

```
/harmony-scheduler-api
├── /src
│   ├── /config                    # Configuration
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── jwt.js
│   │   └── email.js
│   │
│   ├── /models                    # Modèles Mongoose
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── Availability.js
│   │   ├── Analytics.js
│   │   └── Notification.js
│   │
│   ├── /services                  # Logique métier
│   │   ├── authService.js
│   │   ├── calendarService.js
│   │   ├── harmonyEngineService.js
│   │   ├── notificationService.js
│   │   └── subscriptionService.js
│   │
│   ├── /controllers               # Contrôleurs HTTP
│   │   ├── authController.js
│   │   ├── calendarController.js
│   │   ├── analyticsController.js
│   │   └── userController.js
│   │
│   ├── /routes                    # Routes API
│   │   ├── auth.routes.js
│   │   ├── calendar.routes.js
│   │   ├── analytics.routes.js
│   │   └── index.js
│   │
│   ├── /middleware                # Middlewares
│   │   ├── auth.middleware.js
│   │   ├── tenant.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── /utils                     # Utilitaires
│   │   ├── encryption.js
│   │   ├── validators.js
│   │   ├── dateHelpers.js
│   │   └── logger.js
│   │
│   ├── /jobs                      # Tâches cron
│   │   ├── dailyReport.job.js
│   │   ├── cleanup.job.js
│   │   └── reminder.job.js
│   │
│   └── /websocket                 # WebSocket handlers
│       ├── connection.handler.js
│       └── calendar.events.js
│
├── /tests                         # Tests
│   ├── /unit
│   ├── /integration
│   └── /e2e
│
├── /scripts                       # Scripts utilitaires
│   ├── migrate.js
│   └── seed.js
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## 🔐 Authentification & Sécurité

### Flux JWT

```
┌─────────┐                    ┌─────────────┐                    ┌─────────┐
│  Client │ ── POST /login ──► │ Auth Service│ ── Vérification ──►│  DB     │
│         │                    │             │                    │         │
│         │ ◄── JWT Token ──── │             │ ◄── Utilisateur ───│         │
└─────────┘                    └─────────────┘                    └─────────┘
       │
       │  Requête API
       ▼
┌─────────────┐
│  Middleware │ ── Vérification JWT ──► Accès ou 401
│   verifyJWT   │
└─────────────┘
```

### Modèle User (Mongoose)

```javascript
const userSchema = new Schema({
  // Identification
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  
  // Profil
  firstName: String,
  lastName: String,
  avatar: String,
  
  // Professionnel
  profession: String,
  companyName: String,
  timezone: { type: String, default: 'Europe/Paris' },
  
  // Préférences
  settings: {
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '18:00' }
    },
    defaultDuration: { type: Number, default: 60 },
    breakDuration: { type: Number, default: 20 },
    maxDailyAppointments: { type: Number, default: 8 },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  
  // Abonnement (SaaS)
  subscription: {
    plan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: { 
      type: String, 
      enum: ['active', 'cancelled', 'past_due'],
      default: 'active'
    },
    currentPeriodEnd: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },
  
  // Sécurité
  emailVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  lastLoginAt: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

---

## 📊 Modèle de Données Multi-Tenant

### Stratégie de Sharding

```javascript
// Chaque collection inclut tenant_id pour le sharding
const eventSchema = new Schema({
  tenant_id: { type: ObjectId, required: true, index: true },
  user_id: { type: ObjectId, required: true, index: true },
  
  // Données de l'événement
  title: String,
  start: Date,
  end: Date,
  clientName: String,
  clientEmail: String,
  status: String,
  
  // ... autres champs
});

// Index composite pour les requêtes fréquentes
eventSchema.index({ tenant_id: 1, user_id: 1, start: 1 });
```

### Plans d'Abonnement

| Plan | Prix | RDV/mois | Utilisateurs | Features |
|------|------|----------|--------------|----------|
| Free | €0 | 50 | 1 | Basique |
| Pro | €19/mois | Illimité | 1 | + Analytics avancés |
| Enterprise | €49/mois | Illimité | 5 | + Multi-user, API |

---

## 🚀 Déploiement

### Docker Compose (Développement)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/harmony
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

### Kubernetes (Production)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: harmony-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: harmony-api
  template:
    metadata:
      labels:
        app: harmony-api
    spec:
      containers:
      - name: api
        image: harmony-scheduler/api:v2.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## 📡 API Endpoints

### Authentification

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/2fa/enable
POST   /api/v1/auth/2fa/verify
```

### Calendrier

```
GET    /api/v1/events                    # Liste avec filtres
POST   /api/v1/events                    # Créer
GET    /api/v1/events/:id                # Détail
PUT    /api/v1/events/:id                # Modifier
DELETE /api/v1/events/:id                # Supprimer
GET    /api/v1/availability              # Disponibilités
PUT    /api/v1/availability              # Mettre à jour
GET    /api/v1/slots?date=2025-01-15     # Créneaux libres
```

### Analytics

```
GET    /api/v1/analytics/score           # Score Harmony
GET    /api/v1/analytics/weekly-report   # Rapport hebdo
GET    /api/v1/analytics/predictions     # Prédictions ML
GET    /api/v1/analytics/export          # Export CSV/JSON
```

---

## 🔮 Roadmap Évolutive

### Phase 1: MVP SaaS (Mois 1-3)
- [ ] Backend Node.js + Express
- [ ] MongoDB avec sharding
- [ ] Authentification JWT
- [ ] API REST complète
- [ ] Intégration Stripe

### Phase 2: Features Avancées (Mois 4-6)
- [ ] WebSocket temps réel
- [ ] Mobile app React Native
- [ ] Intégrations (Google Calendar, Outlook)
- [ ] API publique
- [ ] Webhooks

### Phase 3: Scale & ML (Mois 7-12)
- [ ] Microservices
- [ ] ML avancé (TensorFlow.js)
- [ ] White-label
- [ ] Marketplace d'intégrations
- [ ] Internationalisation

---

## 💰 Modèle Économique

### Revenus
- **Abonnements**: €19-49/mois
- **Commission**: 2% sur paiements intégrés
- **API**: €0.01/appel au-delà du quota

### Coûts (estimation 1000 utilisateurs)
- **Infrastructure**: ~€500/mois
- **MongoDB Atlas**: ~€200/mois
- **Redis Cloud**: ~€50/mois
- **SendGrid**: ~€100/mois
- **Stripe**: 1.5% + €0.25/transaction

### Métriques Clés
- CAC (Customer Acquisition Cost): €50
- LTV (Lifetime Value): €300
- MRR Goal (Month 12): €50K
