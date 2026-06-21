<div align="center">

# 🎯 ChurnGuard

**Customer Retention Intelligence — ML-Powered Churn Prediction with Explainability**

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Scikit-learn](https://img.shields.io/badge/Scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

> ChurnGuard predicts customer churn risk and explains *why* each customer is likely to leave, using SHAP (Shapley Additive Explanations). It mirrors how real retention teams triage at-risk accounts — combining a live dashboard, single-customer prediction, batch CSV scoring, and full model performance reporting.

</div>

---

## 🧠 Why This Project Exists

Most churn prediction demos stop at "here's an accuracy score." ChurnGuard goes further: every prediction comes with a SHAP-based feature attribution, so a retention team can see exactly which factors are pushing a customer toward cancellation — and act on it with a recommended retention strategy, not just a probability.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Dashboard Home** | Real-time portfolio metrics — total customers tracked, high/medium risk counts, revenue at risk, churn trend over time, and a prioritized list of the highest-risk accounts |
| **Single Customer Predictor** | Input any customer's profile and get an instant churn probability with a SHAP waterfall chart showing exactly which features increase or decrease risk |
| **Batch Analysis** | Upload a CSV of customers and get churn scores, risk segmentation, and a downloadable report for the entire cohort |
| **Model Performance** | Full evaluation suite — accuracy, precision, recall, F1, AUC-ROC, confusion matrix, ROC curve, and global SHAP feature importance |

---

## 🛠️ Tech Stack

**Backend**
- FastAPI (Python) — REST API
- Scikit-learn — Logistic Regression classifier
- SHAP — model explainability
- SQLite — lightweight persistence layer

**Frontend**
- React + TypeScript
- Vite — build tooling
- Tailwind CSS v4
- Recharts — data visualization
- Lucide React — icons

---

## 📊 Model Performance

Trained on a synthetic dataset of 150 customer profiles with features including tenure, monthly charges, contract type, internet service, tech support, number of products, and payment method.

| Metric | Score |
|---|---|
| Accuracy | 90.3% |
| Precision | 81.8% |
| Recall | 88.0% |
| F1-Score | 84.8% |
| AUC-ROC | 0.969 |

SHAP values are computed analytically for the linear model — making every explanation mathematically exact, not approximated.

---

## 🏗️ Architecture

```
            React + Tailwind + Recharts
       Dashboard | Predictor | Batch | Performance
                       │
                   REST API
                       │
               FastAPI + SQLite
       ┌───────────────┼───────────────┐
       │                               │
   SQLite DB              Logistic Regression Model
                                       │
                          SHAP Attribution Engine
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend Setup
```bash
cd backend
pip install fastapi uvicorn scikit-learn shap pandas numpy python-multipart python-dotenv
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

On first run, the server automatically generates synthetic training data, trains the model, computes evaluation metrics, and seeds the database — no manual setup required.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies all `/api` requests to the FastAPI backend on port 8000.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/metrics` | Aggregate portfolio statistics |
| GET | `/api/dashboard/charts` | Segment and trend chart data |
| GET | `/api/dashboard/high-risk` | Top 20 highest-risk customers |
| POST | `/api/predict` | Single customer churn prediction + SHAP |
| POST | `/api/predict/batch` | Batch CSV churn scoring |
| POST | `/api/dashboard/reset` | Reset database to baseline seed data |
| GET | `/api/model/performance` | Model evaluation metrics |

---

## 🤔 Design Decisions

**Why Logistic Regression over a more complex model?**
SHAP attribution is exact (not approximated) for linear models, which matters for a retention use case where the business needs to trust and act on individual-level explanations. The accuracy/interpretability tradeoff favors a simpler model here.

**Why optimize for recall over raw accuracy?**
A missed churner (false negative) costs the full subscription value. A false positive costs a small retention discount. The classification threshold is tuned accordingly rather than defaulting to 0.5.

---

## 🗺️ Roadmap

- [ ] Model drift detection (e.g. via Evidently AI)
- [ ] Counterfactual "what-if" feature simulator
- [ ] PostgreSQL migration for production deployment
- [ ] Dockerized deployment

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">

🎯 **ChurnGuard — Know who's leaving. Know why. Act on it.**

</div>
