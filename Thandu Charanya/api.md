# FoodBridge AI - API Endpoint Reference

All endpoints prefixed with `/api`. Interactive Swagger docs available at `http://127.0.0.1:8000/docs`.

| Tag | Method | Endpoint | Description |
|---|---|---|---|
| Authentication | POST | `/auth/register` | Register user & business account |
| Authentication | POST | `/auth/login` | Authenticate & retrieve JWT Bearer token |
| Authentication | GET | `/auth/me` | Fetch authenticated profile |
| Business | GET | `/business/me` | Fetch business organization profile |
| Business | PUT | `/business/me` | Update business organization profile |
| Inventory | GET | `/inventory` | List business inventory items |
| Inventory | POST | `/inventory` | Add new inventory product |
| Inventory | GET | `/inventory/{id}` | Get product details |
| Inventory | PUT | `/inventory/{id}` | Update product details |
| Inventory | DELETE | `/inventory/{id}` | Delete product |
| Forecasting | POST | `/forecast/train/{id}` | Train Prophet model & forecast demand |
| Forecasting | GET | `/forecast/{id}` | Retrieve forecast predictions |
| Waste Risk | GET | `/waste-risk` | List prioritized waste risk scores |
| Waste Risk | POST | `/waste-risk/calculate/{id}` | Recalculate waste risk score |
| Smart Reorder | GET | `/reorder` | List recommended reorder quantities |
| Surplus | GET | `/surplus` | Identify surplus inventory candidates |
| Donations | GET | `/donations` | List donation offerings |
| Donations | POST | `/donations` | Create food donation listing |
| Dashboard | GET | `/dashboard/summary` | Fetch top-level dashboard metrics |
