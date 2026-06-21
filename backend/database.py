import os
import sqlite3
from datetime import datetime

DATABASE_FILE = os.getenv("DATABASE_URL", "./database.db")

# Resolve database path relative to backend folder
if DATABASE_FILE.startswith("./"):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, DATABASE_FILE[2:])
else:
    db_path = DATABASE_FILE


def get_db_connection():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(force_reseed=False):
    """Initializes the SQLite database schema and seeds it with mock customers if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Detect wrong/legacy database schema
    if not force_reseed:
        try:
            cursor.execute("SELECT churn_probability FROM customers LIMIT 1;")
        except sqlite3.OperationalError:
            print("Wrong database schema detected. Dropping old tables and re-seeding...")
            force_reseed = True

    if force_reseed:
        cursor.execute("DROP TABLE IF EXISTS customers;")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        tenure INTEGER NOT NULL,
        monthly_charges REAL NOT NULL,
        contract_type TEXT NOT NULL,
        internet_service TEXT NOT NULL,
        tech_support TEXT NOT NULL,
        number_of_products INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        churn_probability REAL NOT NULL,
        top_risk_factor TEXT NOT NULL,
        is_mock INTEGER DEFAULT 1
    );
    """)
    conn.commit()

    # Check row count
    cursor.execute("SELECT COUNT(*) FROM customers;")
    count = cursor.fetchone()[0]

    if count == 0:
        print("Seeding SQLite database with mock customer data...")
        from churn_model import generate_synthetic_data, calculate_shap_values

        # Generate 150 synthetic customer samples
        df = generate_synthetic_data(num_samples=150, random_seed=42)

        customers = []
        for _, row in df.iterrows():
            cust_dict = row.to_dict()

            # Predict probability and SHAP values using the trained model
            shap_result = calculate_shap_values(cust_dict)
            prob = shap_result["probability"]

            # Find the top risk factor (the feature pushing risk UP the most)
            positive_shaps = [s for s in shap_result["shap_values"] if s["value"] > 0]
            top_risk = positive_shaps[0]["feature"] if positive_shaps else "None"

            customers.append((
                cust_dict["customer_id"],
                int(cust_dict["tenure"]),
                float(cust_dict["monthly_charges"]),
                cust_dict["contract_type"],
                cust_dict["internet_service"],
                cust_dict["tech_support"],
                int(cust_dict["number_of_products"]),
                cust_dict["payment_method"],
                float(prob),
                top_risk,
                1  # is_mock
            ))

        cursor.executemany("""
        INSERT INTO customers (
            customer_id, tenure, monthly_charges, contract_type, internet_service,
            tech_support, number_of_products, payment_method, churn_probability,
            top_risk_factor, is_mock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, customers)
        conn.commit()
        print(f"Database seeded with {len(customers)} mock customers successfully.")

    conn.close()


def get_high_risk_customers(limit=20):
    """Retrieves the top N highest-risk customers sorted by churn probability descending."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT customer_id, tenure, monthly_charges, contract_type, internet_service,
               tech_support, number_of_products, payment_method, churn_probability,
               top_risk_factor, is_mock
        FROM customers
        ORDER BY churn_probability DESC
        LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_dashboard_metrics():
    """Computes aggregate customer churn statistics from database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Total Customers
    cursor.execute("SELECT COUNT(*) FROM customers;")
    total_customers = cursor.fetchone()[0]

    # 2. High Risk (>70%)
    cursor.execute("SELECT COUNT(*) FROM customers WHERE churn_probability > 0.70;")
    high_risk_count = cursor.fetchone()[0]

    # 3. Medium Risk (40-70%)
    cursor.execute("SELECT COUNT(*) FROM customers WHERE churn_probability >= 0.40 AND churn_probability <= 0.70;")
    medium_risk_count = cursor.fetchone()[0]

    # 4. Revenue at Risk (defined as monthly charges of high-risk customers)
    cursor.execute("SELECT SUM(monthly_charges) FROM customers WHERE churn_probability > 0.70;")
    revenue_at_risk = cursor.fetchone()[0] or 0.0

    conn.close()

    return {
        "total_customers": total_customers,
        "high_risk_count": high_risk_count,
        "medium_risk_count": medium_risk_count,
        "revenue_at_risk": round(revenue_at_risk, 2)
    }


def get_charts_data():
    """Generates grouped summaries for rendering Recharts components on the frontend."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Segment Churn probability distribution (grouped by Internet Service Type)
    cursor.execute("""
        SELECT internet_service, COUNT(*) as count, AVG(churn_probability) as avg_churn
        FROM customers
        GROUP BY internet_service;
    """)
    internet_rows = cursor.fetchall()
    segment_data = []
    for r in internet_rows:
        segment_data.append({
            "segment": r["internet_service"],
            "count": r["count"],
            "avg_churn": round(float(r["avg_churn"] * 100), 1)
        })

    # Contract Type segmentation
    cursor.execute("""
        SELECT contract_type, COUNT(*) as count, AVG(churn_probability) as avg_churn
        FROM customers
        GROUP BY contract_type;
    """)
    contract_rows = cursor.fetchall()
    contract_segment_data = []
    for r in contract_rows:
        contract_segment_data.append({
            "segment": r["contract_type"],
            "count": r["count"],
            "avg_churn": round(float(r["avg_churn"] * 100), 1)
        })

    conn.close()

    # Churn trend over last 6 months (consistent illustrative trend values)
    trend_data = [
        {"month": "Jan", "churn_rate": 26.2, "high_risk_revenue": 14200},
        {"month": "Feb", "churn_rate": 24.8, "high_risk_revenue": 13900},
        {"month": "Mar", "churn_rate": 25.5, "high_risk_revenue": 14500},
        {"month": "Apr", "churn_rate": 23.1, "high_risk_revenue": 12800},
        {"month": "May", "churn_rate": 22.4, "high_risk_revenue": 11900},
        {"month": "Jun", "churn_rate": 21.7, "high_risk_revenue": 11500}
    ]

    return {
        "segments_internet": segment_data,
        "segments_contract": contract_segment_data,
        "churn_trend": trend_data
    }


def save_batch_customers(customer_list):
    """
    Saves a batch of parsed customer dictionaries to the database.
    Updates or inserts customer profiles, setting `is_mock` to 0 (user input).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        inserted = []
        for cust in customer_list:
            cursor.execute("""
                INSERT OR REPLACE INTO customers (
                    customer_id, tenure, monthly_charges, contract_type, internet_service,
                    tech_support, number_of_products, payment_method, churn_probability,
                    top_risk_factor, is_mock
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
            """, (
                cust["customer_id"],
                cust["tenure"],
                cust["monthly_charges"],
                cust["contract_type"],
                cust["internet_service"],
                cust["tech_support"],
                cust["number_of_products"],
                cust["payment_method"],
                cust["churn_probability"],
                cust["top_risk_factor"]
            ))
            inserted.append(cust)
        conn.commit()
        return len(inserted)
    except Exception as e:
        print(f"Error saving batch customers: {e}")
        conn.rollback()
        raise e
    finally:
        conn.close()


def clear_user_uploaded_data():
    """Removes all non-mock (user uploaded) customers and restores baseline statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM customers WHERE is_mock = 0;")
    conn.commit()
    conn.close()