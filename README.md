# FwdNourish! 🌱
### AI-Powered Food Waste Management Platform for Surplus Identification and Redistribution Optimization

FwdNourish! is an AI-powered food waste management platform that helps businesses monitor inventory, identify food approaching expiry, forecast waste risk, and redistribute eligible surplus food to NGOs. The platform connects donors and recipient organizations through donation listings, intelligent matching, pickup coordination, and transaction tracking.

The goal is to reduce avoidable food waste while helping surplus food reach organizations and communities that can use it.

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [AI Forecasting](#ai-forecasting)
- [Donation Workflow](#donation-workflow)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## Overview

Food businesses can have products that remain unsold as their expiry dates approach. At the same time, NGOs and community organizations may need food donations. FwdNourish! provides a shared platform to help coordinate these two sides.

Businesses can maintain inventory, monitor expiry status, review AI-generated insights, and publish eligible surplus as donations. NGOs can post requirements, review suitable listings or matches, and coordinate pickups. Administrators can review and manage registered accounts.

## Key Features

### Business Dashboard
- Dashboard for inventory, expiry alerts, donations, transactions, and AI insights.
- Inventory creation and management.
- Inventory entry through manual forms, CSV uploads, and barcode/QR scanning where configured.
- POS integration support for importing sales or inventory information through configured APIs.
- Product categories and expiry-status monitoring.
- Donation creation and pickup coordination.
- Transaction history that includes relevant donation information.

### AI-Powered Inventory Insights
- Forecasting and inventory analysis.
- Waste-risk insights to help identify products that may become surplus.
- Reorder recommendations where supported by available data.
- Batch prediction support for inventory analysis.
- Prophet forecasting model selected following evaluation against an LSTM alternative.

### Surplus Donation and Matching
- Create donation listings from eligible inventory.
- Exclude unsuitable inventory, such as expired products or products with no available quantity, from donation selection.
- Match donations with active NGO requirements.
- Score potential matches using food/product relevance, quantity, distance, and expiry urgency.
- Support pickup scheduling and donation-status tracking.

### NGO Dashboard
- Manage NGO profile information.
- Publish and maintain food requirements.
- Review donation opportunities and matching results.
- Coordinate pickup details and recipient information.
- Track donation and pickup status.

### Administration
- Role-based access for administrators, businesses, and NGOs.
- Review and verification workflows for registered accounts.
- Administrative dashboard and account-management views.

### Progressive Web App (PWA)
- Installable web application experience on supported devices and browsers.
- PWA manifest and service-worker support.
- Responsive layouts designed for desktop and mobile use.

> Available functionality depends on the current deployment configuration, permissions, and integration settings.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript |
| UI and styling | Tailwind CSS |
| Charts and analytics | Recharts |
| Backend API | Python, FastAPI |
| Data validation | Pydantic |
| Database | PostgreSQL |
| Database/backend services | Supabase, according to the deployed configuration |
| Forecasting | Prophet; LSTM used for model comparison |
| Data processing | Pandas, NumPy, scikit-learn |
| Authentication | JWT-based authentication and password hashing |
| API communication | REST APIs with JSON |
| PWA | Web app manifest and service worker |
| Frontend deployment | Vercel |
| Backend deployment | Configure according to the active hosting environment |

## System Architecture

```text
┌───────────────────────────────────────────────┐
│              React + TypeScript               │
│ Business Dashboard │ NGO Dashboard │ Admin     │
└──────────────────────┬────────────────────────┘
                       │ REST API / JSON
                       ▼
┌───────────────────────────────────────────────┐
│                  FastAPI                      │
│ Authentication │ Inventory │ Donations        │
│ Expiry Tracking │ NGO Requirements │ Matching  │
│ Transactions │ AI Forecasting                  │
└──────────────┬─────────────────┬──────────────┘
               │                 │
               ▼                 ▼
┌────────────────────────┐  ┌───────────────────┐
│ PostgreSQL / Supabase  │  │ Python AI Services│
│ Users, inventory,      │  │ Prophet forecasting│
│ donations, requirements│  │ Risk/reorder logic │
│ and transactions       │  │ Batch predictions │
└────────────────────────┘  └───────────────────┘
```

## AI Forecasting

FwdNourish! uses forecasting to support inventory planning and food-waste reduction.

### Model selection

The project evaluated Prophet and LSTM using the FreshRetailNet-50K dataset. The recorded evaluation results were:

| Metric | Prophet |
|---|---:|
| MAE | 175.0125 |
| RMSE | 206.7699 |
| sMAPE | 21.3257 |

Prophet was selected because it performed better than the tested LSTM alternative in the recorded evaluation. These figures are specific to the project's evaluation setup and should not be interpreted as a guarantee of production accuracy.

### AI capabilities
- Forecast-based inventory insights.
- Waste-risk analysis.
- Inventory reorder recommendations.
- Batch prediction generation and storage of prediction results.

Forecast quality depends on the available data, preprocessing, model artifacts, and the prediction configuration used by the running environment.

## Donation Workflow

1. **Register and sign in:** Businesses and NGOs create accounts; administrators review accounts according to the configured workflow.
2. **Manage inventory:** Businesses add products manually, by CSV, or through supported integrations.
3. **Monitor expiry:** The platform calculates remaining shelf life and classifies expiry status.
4. **Identify surplus:** Businesses select eligible inventory for donation.
5. **Find suitable NGOs:** The matching service compares donations with active NGO requirements.
6. **Coordinate pickup:** The relevant parties confirm recipient and pickup details.
7. **Update donation status:** The donation progresses through the configured pickup and completion workflow.
8. **Track activity:** Users can review donation and transaction records.

### Matching approach

The matching service uses a weighted score based on four factors:

| Factor | Weight |
|---|---:|
| Food/product match | 40% |
| Quantity suitability | 25% |
| Distance | 20% |
| Expiry urgency | 15% |

Distance is calculated using the Haversine formula when coordinates are available. The resulting score helps prioritize potential matches; final suitability still depends on food safety, availability, and pickup feasibility.

## User Roles

| Role | Main responsibilities |
|---|---|
| Administrator | Review accounts and manage platform administration |
| Business / Donor | Manage inventory, view expiry and AI insights, create donations, and track transactions |
| NGO / Recipient | Publish food requirements, review donation opportunities, and coordinate pickups |

Access to protected actions is controlled by authentication and role-based permissions.

## Project Structure

The repository is organized into frontend and backend applications. The exact files may vary by branch.

```text
FwdNourish/
├── frontend/
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── sw.js
│   │   └── icons/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── types/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   ├── artifacts/
│   │   └── forecasting/
│   ├── requirements-production.txt
│   └── app entry point
│
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the application locally:

- Node.js and npm
- Python 3.11 recommended for the documented deployment configuration
- Access to a PostgreSQL database
- Git

You will also need the required environment variables and any model artifacts needed by the AI services.

### 1. Clone the repository

```bash
git clone https://github.com/Siddhant-Sharma1009/FwdNourish.git
cd FwdNourish
```

### 2. Configure the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install the backend dependencies using the dependency file available in your branch:

```bash
pip install -r requirements-production.txt
```

If you use a separate development requirements file, install that file instead.

Create a `.env` file in the backend directory and configure the variables required by your environment. See [Environment Variables](#environment-variables).

Run the API from the backend directory:

```bash
uvicorn app.main:app --reload
```

The local API will normally be available at `http://127.0.0.1:8000`.

FastAPI interactive API documentation is normally available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

These URLs assume the default local host and port.

### 3. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create the frontend environment file required by your application and set the API base URL to your local backend. The variable name must match the one read by the frontend code; for Vite applications this is commonly a variable prefixed with `VITE_`.

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

### 4. Verify the integration

- Confirm that the backend starts successfully and connects to the configured database.
- Confirm that the frontend API base URL points to the intended backend.
- Verify that CORS allows the frontend origin.
- Test login and role-based access.
- Check inventory, expiry alerts, AI predictions, donation matching, pickup updates, and transactions.
- Verify that required forecasting artifacts are present if AI endpoints depend on saved model files.

## Environment Variables

Use the variable names expected by the code in your current branch. Common backend deployment settings include:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Secret used to sign or validate authentication tokens |
| `CORS_ORIGINS` | Allowed frontend origins |
| `ENABLE_SCHEDULER` | Enables scheduled background jobs when supported |
| `PYTHON_VERSION` | Python runtime version for platforms that use this setting |

The frontend also needs its configured API base URL, often stored in a Vite environment variable such as `VITE_API_BASE_URL`. Confirm the exact name in the frontend source before setting it.

**Security:** Use strong, unique secrets. Never commit `.env` files, database credentials, API keys, access tokens, or production secrets to Git. Use your hosting provider's secret/environment-variable settings for deployments.

## Running the Application

Run the backend and frontend in separate terminals during local development.

- Frontend: React application served by the configured development server.
- Backend: FastAPI service.
- Database: PostgreSQL instance configured through `DATABASE_URL`.
- AI services: Python forecasting and prediction services with the required model artifacts.
- Scheduled jobs: Enabled only when configured and supported by the deployment environment.

For database migrations, seed data, or account setup, follow the scripts and instructions present in the current repository branch. Do not assume that a fresh database is automatically populated.

## API Overview

The backend exposes REST endpoints for the platform's main workflows. Route prefixes may differ by version or deployment configuration.

| Area | Purpose |
|---|---|
| Authentication | Registration, login, and current-user details |
| Tenants / Businesses | Business account and profile operations |
| Inventory | Create, list, update, and manage inventory |
| CSV Upload | Bulk inventory import |
| POS Integration | Import supported point-of-sale data |
| Categories | Product category operations |
| Expiry | Expiry status and alert retrieval |
| AI | Waste-risk analysis, forecasting, and reorder recommendations |
| Donations | Create and manage surplus donation listings |
| NGO Requirements | Manage recipient food requirements |
| Matching | Identify suitable donation-recipient matches |
| Transactions | Review sale and donation activity |

For the exact paths, HTTP methods, request schemas, and response formats, run the backend and inspect the interactive API documentation at `/docs`.

## Deployment

### Frontend

The frontend has been deployed on Vercel. Configure the production API base URL in the Vercel project environment settings and redeploy after changing production environment variables.

### Backend and database

Configure the FastAPI service and PostgreSQL/Supabase connection according to the active deployment architecture.

Typical backend deployment settings include:

- Install dependencies from `requirements-production.txt`.
- Start command for a standard ASGI deployment:

  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

- Set `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, and other required environment variables.
- Set `ENABLE_SCHEDULER=true` only if the deployment is intended to run the scheduler and the hosting setup supports it.
- Ensure required model artifacts are included or downloaded securely during deployment.
- Confirm that the frontend origin is allowed by the backend CORS configuration.

The start command above is suitable for a hosting environment that runs the FastAPI application as an ASGI service. Adapt it if your current Supabase setup uses a different backend deployment mechanism.

### PWA installation

To test the installable experience, deploy the frontend over HTTPS and verify the web manifest, icons, and service worker. Browser installation support and caching behavior vary by platform. After releasing frontend changes, refresh or update the installed PWA if it continues to display an older version.

## Security Notes

- Enforce role-based authorization on the backend, not only in the frontend.
- Hash passwords and protect authentication secrets.
- Validate uploaded CSV data and all API inputs.
- Restrict CORS to trusted frontend origins in production.
- Keep database credentials and secrets outside source control.
- Avoid exposing personal contact details or location information to unauthorized users.
- Validate food eligibility and pickup feasibility before completing a donation.

## Future Enhancements

Potential areas for further development include:
- More robust demand and surplus forecasting.
- Route and pickup optimization across multiple donations.
- Notifications for urgent expiry alerts and pickup updates.
- Additional POS integrations and automated inventory synchronization.
- Expanded analytics for food saved, donations completed, and estimated environmental impact.
- Automated model evaluation and monitoring.

## Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Commit with a clear message.
5. Open a pull request describing the changes.

Please avoid committing secrets, generated credentials, or private production data.

## License

No license has been specified in this README. Unless the repository contains a license file, usage and redistribution permissions should not be assumed. Add an appropriate `LICENSE` file if you intend to publish the project under an open-source license.

---

**FwdNourish! — Turning surplus food into an opportunity to nourish communities.**

