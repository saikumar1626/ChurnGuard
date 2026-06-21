import os
import csv
import io
import sqlite3
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import (
    init_db,
    get_high_risk_customers,
    get_dashboard_metrics,
    get_charts_data,
    save_batch_customers,
    clear_user_uploaded_data
)
from churn_model import (
    get_model_payload,
    calculate_shap_values,
    get_retention_recommendation
)

# Load environment variables
load_dotenv()

# Initialize the database and model cache on server startup
init_db(force_reseed=False)
get_model_payload()

app = FastAPI(
    title="ChurnGuard API",
    description="Customer Churn Prediction and Retention Intelligence Server",
    version="1.0.0"
)

# CORS configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic schema for single prediction request
class PredictRequest(BaseModel):
    tenure: int = Field(..., ge=0, le=72, description="Customer tenure in months")
    monthly_charges: float = Field(..., ge=0, description="Monthly charges in INR")
    contract_type: str = Field(..., description="Contract type: Month-to-month, One year, Two year")
    internet_service: str = Field(..., description="Internet Service: DSL, Fiber optic, No")
    tech_support: str = Field(..., description="Tech Support: Yes, No")
    number_of_products: int = Field(..., ge=1, le=6, description="Number of products purchased")
    payment_method: str = Field(..., description="Payment method type")


# Endpoint: Dashboard aggregate metrics
@app.get("/api/dashboard/metrics")
async def get_metrics():
    try:
        metrics = get_dashboard_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database aggregation error: {str(e)}")


# Endpoint: Dashboard Recharts data
@app.get("/api/dashboard/charts")
async def get_charts():
    try:
        charts = get_charts_data()
        return charts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart data aggregation error: {str(e)}")


# Endpoint: High-risk customer profiles
@app.get("/api/dashboard/high-risk")
async def get_high_risk():
    try:
        customers = get_high_risk_customers(limit=20)
        return customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving high risk customers: {str(e)}")


# Endpoint: Churn prediction for a single customer
@app.post("/api/predict")
async def predict_single(req: PredictRequest):
    try:
        cust_dict = {
            "tenure": req.tenure,
            "monthly_charges": req.monthly_charges,
            "contract_type": req.contract_type,
            "internet_service": req.internet_service,
            "tech_support": req.tech_support,
            "number_of_products": req.number_of_products,
            "payment_method": req.payment_method
        }

        # Calculate SHAP and probability
        shap_res = calculate_shap_values(cust_dict)

        # Get retention action
        rec = get_retention_recommendation(shap_res["shap_values"], cust_dict)

        return {
            "probability": shap_res["probability"],
            "shap_values": shap_res["shap_values"],
            "recommendation": rec
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction service failure: {str(e)}")


# Endpoint: Batch CSV predictions
@app.post("/api/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        # Decode and handle possible BOM (Byte Order Mark) issues
        decoded = contents.decode('utf-8-sig')

        csv_file = io.StringIO(decoded)
        reader = csv.reader(csv_file)

        # Parse headers
        try:
            headers = next(reader)
        except StopIteration:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

        # Clean headers
        headers = [h.strip().lower() for h in headers]

        # Create standard index map
        col_map = {}
        for idx, h in enumerate(headers):
            if h in ['customer_id', 'customer id', 'id', 'custid']:
                col_map['customer_id'] = idx
            elif h in ['tenure', 'tenure (months)', 'tenure_months', 'months']:
                col_map['tenure'] = idx
            elif h in ['monthly_charges', 'monthly charges', 'charges', 'monthlycharges', 'amount']:
                col_map['monthly_charges'] = idx
            elif h in ['contract_type', 'contract type', 'contract', 'contracttype']:
                col_map['contract_type'] = idx
            elif h in ['internet_service', 'internet service', 'internet', 'internetservice']:
                col_map['internet_service'] = idx
            elif h in ['tech_support', 'tech support', 'techsupport', 'support']:
                col_map['tech_support'] = idx
            elif h in ['number_of_products', 'number of products', 'products', 'num_products', 'services']:
                col_map['number_of_products'] = idx
            elif h in ['payment_method', 'payment method', 'payment', 'paymentmethod']:
                col_map['payment_method'] = idx

        # Validate required columns (except customer_id, which we can auto-generate)
        required_keys = ['tenure', 'monthly_charges', 'contract_type', 'internet_service', 'tech_support', 'number_of_products', 'payment_method']
        missing_keys = [k for k in required_keys if k not in col_map]

        if missing_keys:
            raise HTTPException(
                status_code=400,
                detail=f"CSV is missing required columns: {', '.join(missing_keys)}. "
                       "Please ensure headers match the expected features."
            )

        customers_to_save = []
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0

        row_num = 1
        for row in reader:
            if not row or all(cell.strip() == '' for cell in row):
                continue  # skip empty rows

            row_num += 1
            try:
                # Extract values
                cust_id = row[col_map['customer_id']].strip() if 'customer_id' in col_map else f"CUST-BATCH-{1000 + row_num}"
                if not cust_id:
                    cust_id = f"CUST-BATCH-{1000 + row_num}"

                tenure = int(float(row[col_map['tenure']].strip()))
                monthly_charges = float(row[col_map['monthly_charges']].strip())
                contract_type = row[col_map['contract_type']].strip()
                internet_service = row[col_map['internet_service']].strip()
                tech_support = row[col_map['tech_support']].strip()
                number_of_products = int(float(row[col_map['number_of_products']].strip()))
                payment_method = row[col_map['payment_method']].strip()

                # Standardize categories
                contract_type = "Month-to-month" if "month" in contract_type.lower() else "One year" if "one" in contract_type.lower() else "Two year"
                internet_service = "Fiber optic" if "fiber" in internet_service.lower() else "DSL" if "dsl" in internet_service.lower() else "No"
                tech_support = "Yes" if "yes" in tech_support.lower() or tech_support.lower() == "true" else "No"
                payment_method = "Electronic check" if "electronic" in payment_method.lower() else "Mailed check" if "mailed" in payment_method.lower() else "Bank transfer" if "bank" in payment_method.lower() else "Credit card"

                cust_dict = {
                    "tenure": tenure,
                    "monthly_charges": monthly_charges,
                    "contract_type": contract_type,
                    "internet_service": internet_service,
                    "tech_support": tech_support,
                    "number_of_products": number_of_products,
                    "payment_method": payment_method
                }

                # Predict probability and SHAP
                shap_res = calculate_shap_values(cust_dict)
                prob = shap_res["probability"]

                positive_shaps = [s for s in shap_res["shap_values"] if s["value"] > 0]
                top_risk = positive_shaps[0]["feature"] if positive_shaps else "None"

                # Accumulate counts
                if prob > 0.70:
                    high_risk_count += 1
                elif prob >= 0.40:
                    medium_risk_count += 1
                else:
                    low_risk_count += 1

                customers_to_save.append({
                    "customer_id": cust_id,
                    "tenure": tenure,
                    "monthly_charges": monthly_charges,
                    "contract_type": contract_type,
                    "internet_service": internet_service,
                    "tech_support": tech_support,
                    "number_of_products": number_of_products,
                    "payment_method": payment_method,
                    "churn_probability": prob,
                    "top_risk_factor": top_risk
                })

            except Exception as row_err:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error parsing row {row_num}: {str(row_err)}. Please ensure all numeric columns contain valid numbers."
                )

        # Save parsed predictions to database
        save_batch_customers(customers_to_save)

        return {
            "total_analyzed": len(customers_to_save),
            "high_risk_count": high_risk_count,
            "medium_risk_count": medium_risk_count,
            "low_risk_count": low_risk_count,
            "predictions": customers_to_save
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV processing error: {str(e)}")


# Endpoint: Reset/clear user-uploaded dataset from the database
@app.post("/api/dashboard/reset")
async def reset_dashboard_data():
    try:
        clear_user_uploaded_data()
        return {"status": "success", "message": "Dashboard successfully reset to baseline seed data."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset operation failed: {str(e)}")


# Endpoint: Model Performance evaluation data
@app.get("/api/model/performance")
async def get_performance():
    try:
        payload = get_model_payload()
        return payload["metrics"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Performance lookup failure: {str(e)}")


# Mount compiled React build folder if it exists in the workspace
dist_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist"))
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
    print(f"Mounted static frontend from: {dist_path}")
else:
    print(f"Static build directory not found at: {dist_path}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)