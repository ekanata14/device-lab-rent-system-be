# 3D Lab Backend

The backend is built with **Node.js, Express, TypeScript, and Prisma ORM (MySQL)**.

## Core Features

1. REST APIs to manage Printers, Reservations, Settings, and Usage Logs.
2. Background interval processing to handle scheduled operations without locking Node.js.
3. Automatically initializes a default `studio_db` database and sample printers if empty.

## API Endpoints

### Printers

- `GET /api/printers` - List all printers and their current states.
- `POST /api/printers` - Add a new printer to the fleet. (req: `{ name, model }`)
- `DELETE /api/printers/:id` - Delete a given printer unit.
- `POST /api/printers/:id/reserve` - Request reservation block for a printer unit. (req: user data)
- `POST /api/printers/:id/queue` - Join the printer unit queue queue.
- `POST /api/printers/:id/force-stop` - Forcefully halt usage block on a printer unit.
- `POST /api/printers/:id/report-broken` - Lock a unit manually with an error reason.
- `POST /api/printers/:id/reset` - Transition a printer unit to available.

### Usage Logs

- `GET /api/logs` - List chronological history of previous usages and anomalies.

### Lab Settings

- `GET /api/settings` - Fetch lab business operations and manual lock settings.
- `PATCH /api/settings` - Mutate business parameters (isManuallyClosed, openTime, closeTime).

## Running Server

```bash
npm install
npx prisma db push
npx tsx src/index.ts
```
