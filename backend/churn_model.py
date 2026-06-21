import os
import pickle
import math
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, roc_curve, confusion_matrix
# Define schema features
CATEGORICAL_FEATURES = {
    'contract_type': ['Month-to-month', 'One year', 'Two year'],
    'internet_service': ['DSL', 'Fiber optic', 'No'],
    'tech_support': ['Yes', 'No'],
    'payment_method': ['Electronic check', 'Mailed check', 'Bank transfer', 'Credit card']
}
NUMERIC_FEATURES = ['tenure', 'monthly_charges', 'number_of_products']
# Order of final encoded features
ENCODED_FEATURE_NAMES = []
ENCODED_FEATURE_NAMES.extend(NUMERIC_FEATURES)
for col, vals in CATEGORICAL_FEATURES.items():
    for val in vals:
        ENCODED_FEATURE_NAMES.append(f"{col}_{val}")
MODEL_FILE = os.path.join(os.path.dirname(__file__), "churn_model.pkl")
def generate_synthetic_data(num_samples=1200, random_seed=42):
    """Generates a highly realistic synthetic customer churn dataset."""
    np.random.seed(random_seed)
    
    # 1. Generate base features
    tenure = np.random.randint(1, 73, size=num_samples)
    number_of_products = np.random.randint(1, 7, size=num_samples)
    
    contract_choices = ['Month-to-month', 'One year', 'Two year']
    contract_type = np.random.choice(contract_choices, p=[0.50, 0.30, 0.20], size=num_samples)
    
    internet_choices = ['DSL', 'Fiber optic', 'No']
    internet_service = np.random.choice(internet_choices, p=[0.35, 0.45, 0.20], size=num_samples)
    
    tech_support = []
    for inet in internet_service:
        if inet == 'No':
            tech_support.append('No')
        else:
            tech_support.append(np.random.choice(['Yes', 'No'], p=[0.40, 0.60]))
    tech_support = np.array(tech_support)
    
    payment_choices = ['Electronic check', 'Mailed check', 'Bank transfer', 'Credit card']
    payment_method = np.random.choice(payment_choices, p=[0.35, 0.25, 0.20, 0.20], size=num_samples)
    
    # Calculate monthly charges based on services + products
    monthly_charges = []
    for i in range(num_samples):
        # Base charge
        if internet_service[i] == 'DSL':
            base = 45.0
        elif internet_service[i] == 'Fiber optic':
            base = 85.0
        else:
            base = 20.0
            
        # Add-ons
        prod_charge = number_of_products[i] * 12.0
        support_charge = 15.0 if tech_support[i] == 'Yes' else 0.0
        
        # Total + noise
        charge = base + prod_charge + support_charge + np.random.normal(0, 3.0)
        monthly_charges.append(max(15.0, round(charge, 2)))
    monthly_charges = np.array(monthly_charges)
    
    # 2. Define true churn risk weights in log-odds space
    coef_scale = 1.8
    noise_scale = 0.9
    log_odds = (
        - 0.07 * tenure * coef_scale
        + 0.008 * monthly_charges * coef_scale
        - 0.25 * number_of_products * coef_scale
        + np.where(contract_type == 'Month-to-month', 2.0, 0.0) * coef_scale
        + np.where(contract_type == 'Two year', -1.5, 0.0) * coef_scale
        + np.where(internet_service == 'Fiber optic', 1.2, 0.0) * coef_scale
        + np.where(internet_service == 'No', -1.0, 0.0) * coef_scale
        + np.where(tech_support == 'Yes', -0.8, 0.6) * coef_scale
        + np.where(payment_method == 'Electronic check', 1.0, 0.0) * coef_scale
        + np.where(payment_method == 'Credit card', -0.4, 0.0) * coef_scale
        + np.where(payment_method == 'Bank transfer', -0.4, 0.0) * coef_scale
        - 0.20  # Intercept
    )
    
    # Convert log-odds to probability
    prob = 1.0 / (1.0 + np.exp(-log_odds / noise_scale))
    
    # Generate labels
    churn = (np.random.rand(num_samples) < prob).astype(int)
    
    # Create DataFrame
    df = pd.DataFrame({
        'customer_id': [f"CUST-{1000 + i}" for i in range(num_samples)],
        'tenure': tenure,
        'monthly_charges': monthly_charges,
        'contract_type': contract_type,
        'internet_service': internet_service,
        'tech_support': tech_support,
        'number_of_products': number_of_products,
        'payment_method': payment_method,
        'churn': churn
    })
    
    return df
def encode_data(df):
    """One-hot encodes the customer profiles into the model's feature space."""
    X_list = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()
        vec = []
        # Numeric
        vec.append(float(row_dict['tenure']))
        vec.append(float(row_dict['monthly_charges']))
        vec.append(float(row_dict['number_of_products']))
        # Categorical
        for col, vals in CATEGORICAL_FEATURES.items():
            current_val = row_dict.get(col, vals[0])
            for val in vals:
                vec.append(1.0 if current_val == val else 0.0)
        X_list.append(vec)
    return np.array(X_list)
def encode_single(customer_dict):
    """Encodes a single customer dict into a list of 15 features."""
    vec = []
    # Numeric
    vec.append(float(customer_dict.get('tenure', 24)))
    vec.append(float(customer_dict.get('monthly_charges', 60.0)))
    vec.append(float(customer_dict.get('number_of_products', 2)))
    # Categorical
    for col, vals in CATEGORICAL_FEATURES.items():
        current_val = customer_dict.get(col, vals[0])
        for val in vals:
            vec.append(1.0 if current_val == val else 0.0)
    return vec
def train_and_save_model():
    """Generates synthetic data, trains the Logistic Regression model, computes metrics, and pickles all components."""
    print("Generating synthetic training data...")
    df = generate_synthetic_data(num_samples=1500)
    
    X = encode_data(df)
    y = df['churn'].values
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Train Logistic Regression with balanced class weights to maximize recall
    print("Training Logistic Regression Model...")
    model = LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    
    print(f"Metrics - Accuracy: {acc:.4f}, Precision: {prec:.4f}, Recall: {rec:.4f}, F1: {f1:.4f}, AUC: {auc:.4f}")
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    # cm format: [[TN, FP], [FN, TP]]
    tn, fp, fn, tp = cm.ravel()
    
    # ROC Curve points (fpr, tpr, thresholds)
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    # Downsample ROC points to keep the payload size reasonable (e.g. 50 points)
    step = max(1, len(fpr) // 50)
    roc_points = [{"fpr": float(fpr[i]), "tpr": float(tpr[i])} for i in range(0, len(fpr), step)]
    # Ensure end point is 1.0, 1.0
    if len(roc_points) == 0 or roc_points[-1]["fpr"] != 1.0 or roc_points[-1]["tpr"] != 1.0:
        roc_points.append({"fpr": 1.0, "tpr": 1.0})
        
    # Feature Means in training set (for SHAP baseline)
    feature_means = X_train.mean(axis=0).tolist()
    
    # Calculate feature importances
    # SHAP global importance = mean absolute SHAP value for each feature
    # shap_val = beta_j * (x_ij - mean_x_j)
    shap_train = model.coef_[0] * (X_train - X_train.mean(axis=0))
    mean_abs_shap = np.abs(shap_train).mean(axis=0).tolist()
    
    # Group one-hot importances back to original features for overview, or show encoded ones.
    # The user wants top 10 features ranked by SHAP importance.
    # Let's map each of the 15 features for high fidelity.
    global_importance = []
    for idx, name in enumerate(ENCODED_FEATURE_NAMES):
        # Format the name for readability
        readable_name = name.replace("_", " ").title()
        global_importance.append({
            "feature": readable_name,
            "importance": float(mean_abs_shap[idx])
        })
    # Sort descending
    global_importance = sorted(global_importance, key=lambda x: x["importance"], reverse=True)
    
    payload = {
        "coef": model.coef_[0].tolist(),
        "intercept": float(model.intercept_[0]),
        "feature_means": feature_means,
        "metrics": {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "auc_roc": float(auc),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp)
            },
            "roc_curve": roc_points,
            "feature_importance": global_importance
        }
    }
    
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(payload, f)
    print(f"Model saved successfully to {MODEL_FILE}")
    return payload
def load_model():
    """Loads the model payload. Trains a new model if pickle doesn't exist."""
    if not os.path.exists(MODEL_FILE):
        return train_and_save_model()
    try:
        with open(MODEL_FILE, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        print(f"Error loading model: {e}. Retraining...")
        return train_and_save_model()
# Global cached payload
_model_payload = None
def get_model_payload():
    global _model_payload
    if _model_payload is None:
        _model_payload = load_model()
    return _model_payload
def predict_single_probability(customer_dict):
    """Calculates the churn probability for a single customer dictionary."""
    payload = get_model_payload()
    coef = np.array(payload["coef"])
    intercept = payload["intercept"]
    
    vec = np.array(encode_single(customer_dict))
    
    log_odds = intercept + np.dot(coef, vec)
    probability = 1.0 / (1.0 + math.exp(-log_odds))
    return probability
def calculate_shap_values(customer_dict):
    """
    Computes linear SHAP values for a single customer profile.
    Returns:
      - shap_values: list of dicts with feature name and its contribution
      - base_probability: baseline probability of the average customer
      - final_probability: final probability of this customer
    """
    payload = get_model_payload()
    coef = payload["coef"]
    intercept = payload["intercept"]
    means = payload["feature_means"]
    
    vec = encode_single(customer_dict)
    
    # 1. Calculate base log-odds (from means)
    base_log_odds = intercept + sum(coef[i] * means[i] for i in range(len(vec)))
    base_prob = 1.0 / (1.0 + math.exp(-base_log_odds))
    
    # 2. Calculate final log-odds
    final_log_odds = intercept + sum(coef[i] * vec[i] for i in range(len(vec)))
    final_prob = 1.0 / (1.0 + math.exp(-final_log_odds))
    
    # 3. Calculate individual encoded features' SHAP (in log-odds)
    raw_shaps = [coef[i] * (vec[i] - means[i]) for i in range(len(vec))]
    
    # 4. Aggregate encoded SHAP values back to the 7 parent features
    aggregated_shaps = {
        "Tenure": raw_shaps[0],
        "Monthly Charges": raw_shaps[1],
        "Number of Products": raw_shaps[2],
        "Contract Type": sum(raw_shaps[3:6]),
        "Internet Service": sum(raw_shaps[6:9]),
        "Tech Support": sum(raw_shaps[9:11]),
        "Payment Method": sum(raw_shaps[11:15])
    }
    
    # Format for visual return, sorting by absolute contribution size
    shap_list = []
    for name, val in aggregated_shaps.items():
        shap_list.append({
            "feature": name,
            "value": float(val),
            "display_value": get_feature_display_value(name, customer_dict)
        })
        
    # Sort so that features pushing risk UP (positive) or DOWN (negative) are clear
    shap_list = sorted(shap_list, key=lambda x: x["value"], reverse=True)
    
    return {
        "shap_values": shap_list,
        "base_probability": base_prob,
        "probability": final_prob
    }
def get_feature_display_value(feature_name, customer_dict):
    """Helper to return readable text for features in SHAP plots."""
    if feature_name == "Tenure":
        return f"{customer_dict.get('tenure', 0)} months"
    elif feature_name == "Monthly Charges":
        return f"₹{customer_dict.get('monthly_charges', 0)}"
    elif feature_name == "Number of Products":
        return f"{customer_dict.get('number_of_products', 0)} services"
    elif feature_name == "Contract Type":
        return str(customer_dict.get('contract_type', 'Month-to-month'))
    elif feature_name == "Internet Service":
        return str(customer_dict.get('internet_service', 'DSL'))
    elif feature_name == "Tech Support":
        support = customer_dict.get('tech_support', 'No')
        return "With Tech Support" if support == 'Yes' else "No Tech Support"
    elif feature_name == "Payment Method":
        return str(customer_dict.get('payment_method', 'Electronic check'))
    return ""
def get_retention_recommendation(shap_values, customer_dict):
    """
    Returns a retention recommendation based on the top risk factor
    (the feature with the largest positive SHAP contribution).
    """
    # Find the feature that pushed churn probability up the most (positive SHAP)
    positive_shaps = [s for s in shap_values if s["value"] > 0]
    
    if not positive_shaps:
        # Default if everything is negative (low risk)
        return {
            "risk_factor": "None",
            "action": "Maintain standard service level",
            "details": "Customer is highly satisfied. Send quarterly satisfaction survey."
        }
        
    top_factor = positive_shaps[0]["feature"]
    
    if top_factor == "Contract Type":
        return {
            "risk_factor": f"Contract Type ({customer_dict.get('contract_type')})",
            "action": "Offer 20% discount on annual plan",
            "details": "Month-to-month contracts have high flexibility but double the churn rate. Incentivize moving to a 1-year or 2-year contract."
        }
    elif top_factor == "Tenure":
        return {
            "risk_factor": f"Low Tenure ({customer_dict.get('tenure')} months)",
            "action": "Schedule premium onboarding check-in",
            "details": "New customers are highly vulnerable in the first 6 months. Set up a direct phone check-in with a representative to resolve early issues."
        }
    elif top_factor == "Monthly Charges":
        return {
            "risk_factor": f"High Monthly Charges (₹{customer_dict.get('monthly_charges')})",
            "action": "Offer loyalty bundle or downgrade audit",
            "details": "Customer charges are higher than average. Perform an audit to see if they can downgrade unused features or offer a 15% bundle discount."
        }
    elif top_factor == "Tech Support":
        return {
            "risk_factor": "Lack of Tech Support",
            "action": "Provide 3 months of complimentary Tech Support",
            "details": "Customers without tech support are prone to churn after simple technical issues. Provide free premium support to decrease friction."
        }
    elif top_factor == "Internet Service":
        return {
            "risk_factor": f"Fiber Optic Connection Type",
            "action": "Provide free router upgrade & service check",
            "details": "Fiber Optic customers report high satisfaction but also have higher churn due to setup delays. Conduct a line quality inspection."
        }
    elif top_factor == "Payment Method":
        return {
            "risk_factor": f"Payment Method ({customer_dict.get('payment_method')})",
            "action": "Incentivize Auto-Pay enrollment with ₹150 credit",
            "details": "Manual payments (like Electronic Check) create transactional friction. Offer a one-time bill credit to set up credit card auto-pay."
        }
    elif top_factor == "Number of Products":
        return {
            "risk_factor": f"Low Service Stickiness ({customer_dict.get('number_of_products')} product)",
            "action": "Promote cross-sell discount (e.g., Device Security)",
            "details": "Customers with only 1-2 services are much easier to churn. Offer a secondary service at 50% discount to improve customer stickiness."
        }
        
    return {
        "risk_factor": "General Risk",
        "action": "Schedule general relationship review call",
        "details": "Reach out to discuss overall service experience and ensure customer satisfaction."
    }
