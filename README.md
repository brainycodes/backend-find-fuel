# FindFuel - Backend API

**Real-time fuel station data API** — Powered by OpenStreetMap, government sources, and live price scraping.

## 🚀 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18 | Web framework |
| Axios | 1.6 | HTTP client |
| Node-Cache | 5.1 | In-memory caching |
| Express-Rate-Limit | 7.1 | API rate limiting |
| Helmet | 7.1 | Security headers |
| Express-Validator | 7.0 | Input validation |
| CORS | 2.8 | Cross-origin support |
| Morgan | 1.10 | Request logging |

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js                    # Entry point
│   ├── app.js                       # Express app setup
│   ├── config/
│   │   └── index.js                 # Configuration
│   ├── routes/
│   │   ├── index.js                 # API documentation
│   │   ├── stations.js              # Station routes
│   │   ├── prices.js                # Price routes
│   │   ├── countries.js             # Countries routes
│   │   └── geolocation.js           # Geo routes
│   ├── services/
│   │   ├── osmService.js            # OpenStreetMap data
│   │   ├── priceService.js          # Fuel prices (scraper)
│   │   └── geoService.js            # IP geolocation
│   ├── middleware/
│   │   ├── rateLimiter.js           # Rate limiting
│   │   ├── errorHandler.js          # Error handling
│   │   └── validator.js             # Input validation
│   └── utils/
│       ├── cache.js                 # Cache service
│       ├── helpers.js               # Helper functions
│       └── constants.js             # Countries, fuel types
├── .env                              # Environment variables
├── .env.example                      # Template
├── package.json
├── Dockerfile
└── .gitignore
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/brainycodes/backend-find-fuel.git

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your settings

# 4. Run development server
npm run dev

# 5. Run production server
npm start
```

## 🔧 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
HOST=0.0.0.0

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# API Keys
EIA_API_KEY=your_eia_api_key_here          # US gas prices (free)
GOOGLE_PLACES_API_KEY=your_google_key       # Optional (better data)

# Cache
CACHE_TTL=900                               # 15 minutes
CACHE_CHECK_PERIOD=120

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000                 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

## 📡 API Endpoints

### Health Check
```
GET /api/v1/health
```

### Countries
```
GET /api/v1/countries                    → List all countries
GET /api/v1/countries/:code              → Get specific country
GET /api/v1/countries/:code/fuel-types   → Country fuel types
```

### Stations
```
GET /api/v1/stations/nearby?lat=6.5244&lng=3.3792&radius=20&country=NG
GET /api/v1/stations/search?q=shell&country=NG
GET /api/v1/stations/google-nearby?lat=6.5244&lng=3.3792&radius=10
GET /api/v1/stations/:id
```

### Prices
```
GET /api/v1/prices/official/:country     → Official fuel prices
GET /api/v1/prices/all                  → All countries prices
POST /api/v1/prices/report              → Report a price
```

### Geolocation
```
GET /api/v1/geolocation/detect          → Detect user location
GET /api/v1/geolocation/ip              → IP-based location
GET /api/v1/geolocation/coordinates?lat=..&lng=..
```

## 📊 Data Sources

| Source | Type | Coverage |
|--------|------|----------|
| **OpenStreetMap** | Station locations | Global |
| **EIA** | US gas prices | United States |
| **NMDPRA** | Official fuel prices | Nigeria |
| **PPAC** | Fuel prices | India |
| **EPRA** | Fuel prices | Kenya |
| **Dept of Energy** | Fuel prices | South Africa |
| **GlobalPetrolPrices** | Scraped prices | All countries |
| **ipapi.co** | IP geolocation | Global |

## 🏗️ Build & Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm start

# Test
npm test
```

## 🐳 Docker

```bash
# Build image
docker build -t fuel-finder-backend .

# Run container
docker run -p 5000:5000 --env-file .env fuel-finder-backend
```

## 🚀 Deploy

### Railway
```bash
railway init
railway up
```

### Render
1. Push to GitHub
2. New Web Service
3. Connect repo
4. Root directory: `backend`
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables

### Fly.io
```bash
fly launch
fly deploy
```

## 📈 Supported Countries (22)

| Code | Country | Currency |
|------|---------|----------|
| NG | Nigeria | ₦ NGN |
| GH | Ghana | ₵ GHS |
| KE | Kenya | KSh KES |
| ZA | South Africa | R ZAR |
| EG | Egypt | E£ EGP |
| US | United States | $ USD |
| CA | Canada | C$ CAD |
| MX | Mexico | Mex$ MXN |
| BR | Brazil | R$ BRL |
| AR | Argentina | AR$ ARS |
| GB | United Kingdom | £ GBP |
| DE | Germany | € EUR |
| FR | France | € EUR |
| IT | Italy | € EUR |
| ES | Spain | € EUR |
| IN | India | ₹ INR |
| JP | Japan | ¥ JPY |
| AE | UAE | د.إ AED |
| SA | Saudi Arabia | ﷼ SAR |
| CN | China | ¥ CNY |
| AU | Australia | A$ AUD |
| NZ | New Zealand | NZ$ NZD |

## ⚡ Performance

| Feature | Implementation |
|---------|---------------|
| Caching | Node-Cache (15 min TTL) |
| Compression | gzip via compression middleware |
| Rate Limiting | 100 req / 15 min per IP |
| Timeouts | 5-15s for external APIs |
| Batch Processing | Promise.all for parallel fetches |
| Fallbacks | Local data when APIs fail |


## 🔒 Security

- Helmet.js security headers
- CORS restricted to frontend URL
- Rate limiting on all routes
- Input validation with express-validator
- Strict rate limit on price reports

## 📝 License

MIT License

## 👨‍💻 Author

**brainycodes**
**Solomon Zion**
**FE/24/3064259443**