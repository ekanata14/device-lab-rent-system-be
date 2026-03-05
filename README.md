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

## Running Locally (Development)

```bash
npm install
npx prisma db push
npm run dev
```

The application can also be started without hot-reloading using `npm start`.

## Deployment

To deploy this backend on a production server, it is recommended to use a process manager like [PM2](https://pm2.keymetrics.io/) to keep the application running continuously.

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **MySQL database server**
- **Git**

### Steps

1. **Clone the repository onto your server:**

   ```bash
   git clone <your-repository-url>
   # Navigate to the backend directory
   cd <repository-directory>/backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure the environment:**
   Create a `.env` file with your production database URL and necessary configurations:

   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/studio_db"
   PORT=3000
   ```

4. **Initialize the database:**
   Sync your Prisma schema with the MySQL database:

   ```bash
   npx prisma db push
   ```

5. **Install PM2 (if not already installed):**

   ```bash
   npm install -g pm2
   ```

6. **Start the application using PM2:**
   Start the application and name the PM2 process:

   ```bash
   pm2 start npm --name "3d-lab-backend" -- start
   ```

7. **Ensure the application restarts on reboot:**
   ```bash
   pm2 startup
   pm2 save
   ```

Your backend service should now be running in the background. You can monitor its logs anytime using `pm2 logs 3d-lab-backend`.
