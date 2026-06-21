import os
import unittest
import sqlite3
from unittest.mock import patch
import json
import io
from fastapi.testclient import TestClient
# Ensure we configure environment for test db
# Ensure test DB doesn't interfere with dev DB
os.environ["DATABASE_URL"] = "./test_database.db"
# Import items to test
from backend.safety import is_sql_safe
from backend.database import (
    init_db,
    get_db_connection,
    get_schema_metadata,
    execute_select_query,
    log_query_history,
    get_query_history,
    db_path
    get_high_risk_customers,
    get_dashboard_metrics,
    get_charts_data,
    save_batch_customers,
    clear_user_uploaded_data
)
from backend.main import app, detect_chart_type
from backend.churn_model import (
    get_model_payload,
    predict_single_probability,
    calculate_shap_values,
    get_retention_recommendation
)
from backend.main import app
class TestNL2SQLBackend(unittest.TestCase):
class TestChurnGuardBackend(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Remove old test DB if exists
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass
        # Initialize test DB
        init_db()
        # Initialize the test DB with a re-seed force
        init_db(force_reseed=True)
        # Ensure model is cached
        get_model_payload()
        cls.client = TestClient(app)
    @classmethod
    def tearDownClass(cls):
        # Clean up test DB file
        # Remove test database file
        from backend.database import db_path
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass
    def test_sql_safety_validator(self):
        # Safe queries
        safe_queries = [
            "SELECT * FROM customers;",
            "select name, email from customers where region = 1",
            "WITH recent_orders AS (SELECT * FROM orders WHERE order_date > '2025-01-01') SELECT * FROM recent_orders;",
            "SELECT name AS customer_name FROM customers ORDER BY created_at DESC;"
        ]
        for q in safe_queries:
            is_safe, msg = is_sql_safe(q)
            self.assertTrue(is_safe, f"Query should be safe: {q}. Msg: {msg}")
        # Unsafe queries
        unsafe_queries = [
            "DROP TABLE customers;",
            "DELETE FROM orders WHERE id = 1;",
            "UPDATE products SET price = 0.0;",
            "INSERT INTO regions (name, country) VALUES ('Mars', 'Space');",
            "TRUNCATE TABLE query_history;",
            "ALTER TABLE customers ADD COLUMN age INTEGER;",
            "CREATE TABLE hack (id INTEGER);"
        ]
        for q in unsafe_queries:
            is_safe, msg = is_sql_safe(q)
            self.assertFalse(is_safe, f"Query should be blocked: {q}")
            self.assertIn("Dangerous keyword", msg)
        # Non-SELECT statements
        self.assertFalse(is_sql_safe("SHOW TABLES;")[0])
        self.assertFalse(is_sql_safe("EXPLAIN QUERY PLAN SELECT * FROM customers;")[0])
        # Stacked/Multiple queries
        self.assertFalse(is_sql_safe("SELECT * FROM customers; DROP TABLE orders;")[0])
    def test_database_initialization_and_seeding(self):
        conn = get_db_connection()
        cursor = conn.cursor()
    def test_churn_model_prediction(self):
        sample_customer = {
            "tenure": 12,
            "monthly_charges": 85.50,
            "contract_type": "Month-to-month",
            "internet_service": "Fiber optic",
            "tech_support": "No",
            "number_of_products": 2,
            "payment_method": "Electronic check"
        }
        
        # Test tables count
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        self.assertIn("regions", tables)
        self.assertIn("customers", tables)
        self.assertIn("products", tables)
        self.assertIn("orders", tables)
        self.assertIn("query_history", tables)
        prob = predict_single_probability(sample_customer)
        self.assertTrue(0.0 <= prob <= 1.0, f"Probability should be between 0 and 1, got {prob}")
        
        # Check rows exist (seeded successfully)
        cursor.execute("SELECT COUNT(*) FROM regions;")
        self.assertGreater(cursor.fetchone()[0], 0)
        # High charges, Month-to-month, Fiber, No tech support should yield a relatively high risk (>40%)
        self.assertGreater(prob, 0.40, f"Expected higher risk for critical churn markers, got {prob}")
    def test_shap_calculation(self):
        sample_customer = {
            "tenure": 48,
            "monthly_charges": 30.00,
            "contract_type": "Two year",
            "internet_service": "DSL",
            "tech_support": "Yes",
            "number_of_products": 4,
            "payment_method": "Credit card"
        }
        
        cursor.execute("SELECT COUNT(*) FROM customers;")
        self.assertGreater(cursor.fetchone()[0], 0)
        shap_res = calculate_shap_values(sample_customer)
        self.assertIn("probability", shap_res)
        self.assertIn("shap_values", shap_res)
        self.assertIn("base_probability", shap_res)
        
        cursor.execute("SELECT COUNT(*) FROM products;")
        self.assertGreater(cursor.fetchone()[0], 0)
        # Check aggregated features shape
        shap_features = [s["feature"] for s in shap_res["shap_values"]]
        self.assertIn("Tenure", shap_features)
        self.assertIn("Contract Type", shap_features)
        self.assertIn("Monthly Charges", shap_features)
        
        cursor.execute("SELECT COUNT(*) FROM orders;")
        self.assertGreater(cursor.fetchone()[0], 0)
        # The sum of aggregated SHAP values + base log-odds should equal final log-odds
        # base log-odds: log(p_base / (1 - p_base))
        # final log-odds: log(p_final / (1 - p_final))
        p_base = shap_res["base_probability"]
        p_final = shap_res["probability"]
        
        conn.close()
    def test_schema_explorer_metadata(self):
        schema = get_schema_metadata()
        self.assertIn("regions", schema)
        self.assertIn("customers", schema)
        self.assertIn("products", schema)
        self.assertIn("orders", schema)
        base_log_odds = math_log_odds(p_base)
        final_log_odds = math_log_odds(p_final)
        
        customers_schema = schema["customers"]
        column_names = [col["name"] for col in customers_schema["columns"]]
        self.assertIn("id", column_names)
        self.assertIn("name", column_names)
        self.assertIn("email", column_names)
        sum_shaps = sum(s["value"] for s in shap_res["shap_values"])
        
        # Check relationships
        fkeys = customers_schema["foreign_keys"]
        self.assertEqual(len(fkeys), 1)
        self.assertEqual(fkeys[0]["column"], "region")
        self.assertEqual(fkeys[0]["referred_table"], "regions")
        self.assertEqual(fkeys[0]["referred_column"], "id")
        self.assertAlmostEqual(base_log_odds + sum_shaps, final_log_odds, places=5)
    def test_query_history_logging(self):
        # Initial history count
        history = get_query_history()
        initial_len = len(history)
    def test_database_queries(self):
        # 1. Dashboard metrics
        metrics = get_dashboard_metrics()
        self.assertIn("total_customers", metrics)
        self.assertEqual(metrics["total_customers"], 150)
        self.assertIn("high_risk_count", metrics)
        self.assertIn("revenue_at_risk", metrics)
        
        # Log new query
        log_query_history("Who are the customers?", "SELECT name FROM customers LIMIT 5;", 5)
        # 2. Charts data
        charts = get_charts_data()
        self.assertIn("segments_internet", charts)
        self.assertIn("churn_trend", charts)
        self.assertEqual(len(charts["churn_trend"]), 6)
        
        # New history count
        new_history = get_query_history()
        self.assertEqual(len(new_history), initial_len + 1)
        self.assertEqual(new_history[0]["question"], "Who are the customers?")
        self.assertEqual(new_history[0]["sql_query"], "SELECT name FROM customers LIMIT 5;")
        self.assertEqual(new_history[0]["row_count"], 5)
        # 3. High risk customer list
        high_risk = get_high_risk_customers(limit=10)
        self.assertEqual(len(high_risk), 10)
        # Verify ordering is descending
        probs = [c["churn_probability"] for c in high_risk]
        self.assertEqual(probs, sorted(probs, reverse=True))
    def test_chart_type_heuristics(self):
        # 1. Line Chart: date columns
        self.assertEqual(
            detect_chart_type(["order_date", "revenue"], [{"order_date": "2025-06-01", "revenue": 150.0}]),
            "line"
    def test_api_endpoints(self):
        # Test GET /api/dashboard/metrics
        res = self.client.get("/api/dashboard/metrics")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["total_customers"], 150)
        # Test GET /api/dashboard/charts
        res = self.client.get("/api/dashboard/charts")
        self.assertEqual(res.status_code, 200)
        self.assertIn("segments_contract", res.json())
        # Test GET /api/dashboard/high-risk
        res = self.client.get("/api/dashboard/high-risk")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 20)
        # Test POST /api/predict (Single customer)
        payload = {
            "tenure": 24,
            "monthly_charges": 60.0,
            "contract_type": "One year",
            "internet_service": "DSL",
            "tech_support": "Yes",
            "number_of_products": 3,
            "payment_method": "Credit card"
        }
        res = self.client.post("/api/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("probability", data)
        self.assertIn("shap_values", data)
        self.assertIn("recommendation", data)
        # Test GET /api/model/performance
        res = self.client.get("/api/model/performance")
        self.assertEqual(res.status_code, 200)
        metrics = res.json()
        self.assertIn("accuracy", metrics)
        self.assertIn("confusion_matrix", metrics)
        self.assertIn("feature_importance", metrics)
    def test_batch_prediction_api(self):
        # Create a mock CSV buffer
        csv_data = (
            "customer_id,tenure,monthly_charges,contract_type,internet_service,tech_support,number_of_products,payment_method\n"
            "CUST-TEST-1,5,80.0,Month-to-month,Fiber optic,No,1,Electronic check\n"
            "CUST-TEST-2,60,35.0,Two year,DSL,Yes,3,Credit card\n"
        )
        
        # 2. Pie Chart: text + numeric with <= 6 items
        self.assertEqual(
            detect_chart_type(
                ["category", "total"],
                [
                    {"category": "Electronics", "total": 500},
                    {"category": "Apparel", "total": 300}
                ]
            ),
            "pie"
        )
        file_payload = {"file": ("test_batch.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
        res = self.client.post("/api/predict/batch", files=file_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # 3. Bar Chart: text + numeric with > 6 items
        self.assertEqual(
            detect_chart_type(
                ["category", "total"],
                [
                    {"category": "Cat 1", "total": 10},
                    {"category": "Cat 2", "total": 10},
                    {"category": "Cat 3", "total": 10},
                    {"category": "Cat 4", "total": 10},
                    {"category": "Cat 5", "total": 10},
                    {"category": "Cat 6", "total": 10},
                    {"category": "Cat 7", "total": 10}
                ]
            ),
            "bar"
        )
        self.assertEqual(data["total_analyzed"], 2)
        self.assertEqual(len(data["predictions"]), 2)
        
        # 4. Table: multiple fields or non-numeric
        self.assertEqual(
            detect_chart_type(["id", "name", "email"], [{"id": 1, "name": "Alice", "email": "a@b.com"}]),
            "table"
        )
    @patch("backend.main.translate_nl_to_sql")
    def test_api_routes(self, mock_translate):
        # Set up API client
        client = TestClient(app)
        # Verify it got saved to db (so total is now 152)
        metrics = get_dashboard_metrics()
        self.assertEqual(metrics["total_customers"], 152)
        
        # 1. Test /api/schema
        response = client.get("/api/schema")
        self.assertEqual(response.status_code, 200)
        self.assertIn("products", response.json())
        
        # 2. Test /api/history
        response = client.get("/api/history")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        
        # 3. Test /api/query success
        mock_translate.return_value = "SELECT name, price FROM products WHERE price < 50 LIMIT 2;"
        response = client.post("/api/query", json={"question": "cheap products"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["sql"], "SELECT name, price FROM products WHERE price < 50 LIMIT 2;")
        self.assertIn("results", data)
        self.assertEqual(data["columns"], ["name", "price"])
        self.assertEqual(data["chart_type"], "pie") # 2 rows <= 6 -> pie
        
        # 4. Test /api/query safety violation
        mock_translate.return_value = "DROP TABLE products;"
        response = client.post("/api/query", json={"question": "nuke products"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("not allowed", response.json()["detail"])
        # Reset database back to baseline (seed count = 150)
        res_reset = self.client.post("/api/dashboard/reset")
        self.assertEqual(res_reset.status_code, 200)
        metrics_after = get_dashboard_metrics()
        self.assertEqual(metrics_after["total_customers"], 150)
def math_log_odds(p):
    p = max(1e-15, min(1.0 - 1e-15, p))
    return math_log(p / (1.0 - p))
def math_log(x):
    import math
    return math.log(x)
if __name__ == "__main__":
    unittest.main()
