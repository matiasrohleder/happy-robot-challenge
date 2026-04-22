# mcbot

Backend API for an inbound carrier sales AI agent.

Current version: 1.40.0

## Stack

- Node.js
- TypeScript
- Express

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Set required variables in `.env`:

- `PORT` (optional, default `3000`)
- `API_KEY` (required for all `/api/*` routes)
- `FMCSA_WEB_KEY` (required for carrier verification)
- `RAILWAY_VOLUME_MOUNT_PATH` (optional, for persistent metrics storage in Railway)

4. Start in development:

```bash
npm run dev
```

5. Build and run production:

```bash
npm run build
npm start
```

## API Overview

Public endpoints:

- `GET /` -> basic service info
- `GET /health` -> health check
- `GET /api/health` -> health check alias
- `GET /version` -> current app version

Protected endpoints (require header `x-api-key: <API_KEY>`):

- `GET /api/loads/search?equipment_type=<type>&origin_state=<state>`
- `GET /api/carrier/verify?mc_number=<mc_number>`
- `POST /api/webhook`
- `GET /api/metrics`
- `DELETE /api/metrics/:call_id`
- `DELETE /api/metrics`
- `POST /api/metrics/bulk`

## HTTP Response Matrix

| Endpoint | Auth | Success | Common error responses |
| --- | --- | --- | --- |
| `GET /` | No | `200` | - |
| `GET /health` | No | `200` | - |
| `GET /api/health` | No | `200` | - |
| `GET /version` | No | `200` | - |
| `GET /api/loads/search` | Yes | `200` (with matches or empty `data`) | `400` when `equipment_type` or `origin_state` is missing/invalid, `401` invalid/missing API key, `500` when `API_KEY` is not configured |
| `GET /api/carrier/verify` | Yes | `200` | `400` when `mc_number` is missing/invalid, `401` invalid/missing API key, `502` FMCSA upstream failure, `500` when `API_KEY` is not configured |
| `POST /api/webhook` | Yes | `200` (`Webhook received` or `no data to process`) | `401` invalid/missing API key, `415` invalid content type, `500` persistence failure or missing API key config |
| `GET /api/metrics` | Yes | `200` | `401` invalid/missing API key, `500` when `API_KEY` is not configured |
| `DELETE /api/metrics/:call_id` | Yes | `200` | `400` missing `call_id`, `401` invalid/missing API key, `404` metric not found, `500` persistence failure or missing API key config |
| `DELETE /api/metrics` | Yes | `200` | `401` invalid/missing API key, `500` persistence failure or missing API key config |
| `POST /api/metrics/bulk` | Yes | `200` | `400` invalid body shape/empty metrics, `401` invalid/missing API key, `500` persistence failure or missing API key config |

Global fallback routes:

- `404` for unknown resources.
- `500` for unhandled internal errors.

## Request Examples

Search loads:

```bash
curl -H "x-api-key: YOUR_API_KEY" "http://localhost:3000/api/loads/search?equipment_type=Dry%20Van&origin_state=TX"
```

Verify carrier:

```bash
curl -H "x-api-key: YOUR_API_KEY" "http://localhost:3000/api/carrier/verify?mc_number=123456"
```

Webhook payload:

```bash
curl -X POST "http://localhost:3000/api/webhook" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_variables": {
      "mc_number": "123456",
      "carrier_sentiment": "Positive",
      "call_outcome": "Booked",
      "negotiation_rounds": 2,
      "final_rate": 2500,
      "call_duration_seconds": 420,
      "equipment_type": "Dry Van",
      "load_id": "LD-1001",
      "classification": "hot"
    }
  }'
```

## Data Persistence

Metrics are stored in JSON format.

- Railway: `${RAILWAY_VOLUME_MOUNT_PATH}/metrics/metrics.json`
- Local fallback: `data/metrics.json`

## Notes

- Request body parser is limited to `256kb`.
- Metrics persistence is asynchronous and handles missing/corrupt files safely.
- Load search returns `success: true` with an empty array when there are no matches.
