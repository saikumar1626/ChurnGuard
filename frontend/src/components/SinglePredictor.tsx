import React, { useState } from 'react';
import { 
  Sliders, 
  Sparkles, 
  HelpCircle as InfoIcon,
  RefreshCw
} from 'lucide-react';
interface SHAPValue {
  feature: string;
  value: number;
  display_value: string;
}
interface PredictionResult {
  probability: number;
  shap_values: SHAPValue[];
  recommendation: {
    risk_factor: string;
    action: string;
    details: string;
  };
}
export function SinglePredictor() {
  const [tenure, setTenure] = useState<number>(24);
  const [monthlyCharges, setMonthlyCharges] = useState<number>(75.00);
  const [contractType, setContractType] = useState<string>('Month-to-month');
  const [internetService, setInternetService] = useState<string>('Fiber optic');
  const [techSupport, setTechSupport] = useState<string>('No');
  const [numberOfProducts, setNumberOfProducts] = useState<number>(2);
  const [paymentMethod, setPaymentMethod] = useState<string>('Electronic check');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenure,
          monthly_charges: parseFloat(monthlyCharges.toString()),
          contract_type: contractType,
          internet_service: internetService,
          tech_support: techSupport,
          number_of_products: numberOfProducts,
          payment_method: paymentMethod
        })
      });
      if (!res.ok) {
        throw new Error('Prediction API returned an error status.');
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze customer profile.');
    } finally {
      setLoading(false);
    }
  };
  const getRiskColor = (prob: number) => {
    if (prob > 0.70) return '#ef4444'; // Red
    if (prob >= 0.40) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };
  const getRiskText = (prob: number) => {
    if (prob > 0.70) return 'High Risk';
    if (prob >= 0.40) return 'Medium Risk';
    return 'Low Risk';
  };
  // SVG parameters for circular gauge
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const probability = result?.probability || 0;
  const strokeDashoffset = circumference - (probability * circumference);
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Predict Single Customer Churn</h1>
        <p className="text-sm text-slate-500 mt-1">Configure customer contract and service details to run machine learning predictions.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Form Panel (Left) */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl card-shadow p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Sliders className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900">Customer Attributes</h3>
          </div>
          {/* Tenure Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <label htmlFor="tenure-input">Tenure (Months)</label>
              <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">{tenure} months</span>
            </div>
            <input 
              id="tenure-input"
              type="range" 
              min="0" 
              max="72" 
              value={tenure} 
              onChange={(e) => setTenure(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>0m</span>
              <span>12m</span>
              <span>24m</span>
              <span>36m</span>
              <span>48m</span>
              <span>60m</span>
              <span>72m</span>
            </div>
          </div>
          {/* Monthly Charges */}
          <div className="space-y-1.5">
            <label htmlFor="monthly-charges-input" className="text-xs font-semibold text-slate-600 block">Monthly Charges (₹)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                ₹
              </span>
              <input
                id="monthly-charges-input"
                type="number"
                min="0"
                step="0.01"
                value={monthlyCharges}
                onChange={(e) => setMonthlyCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-7 pr-4 py-2 border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg text-xs font-medium text-slate-700 bg-slate-50/50"
                required
              />
            </div>
          </div>
          {/* Contract Type */}
          <div className="space-y-1.5">
            <label htmlFor="contract-type-select" className="text-xs font-semibold text-slate-600 block">Contract Type</label>
            <select
              id="contract-type-select"
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg text-xs font-medium text-slate-700 bg-white"
            >
              <option value="Month-to-month">Month-to-month (High churn risk)</option>
              <option value="One year">One year</option>
              <option value="Two year">Two year (High stickiness)</option>
            </select>
          </div>
          {/* Internet Service */}
          <div className="space-y-1.5">
            <label htmlFor="internet-service-select" className="text-xs font-semibold text-slate-600 block">Internet Service Type</label>
            <select
              id="internet-service-select"
              value={internetService}
              onChange={(e) => {
                const val = e.target.value;
                setInternetService(val);
                if (val === 'No') {
                  setTechSupport('No'); // No internet implies no tech support
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg text-xs font-medium text-slate-700 bg-white"
            >
              <option value="Fiber optic">Fiber optic (Premium, higher charges)</option>
              <option value="DSL">DSL (Standard)</option>
              <option value="No">No Internet Service</option>
            </select>
          </div>
          {/* Tech Support (Yes/No Switch) */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Tech Support Add-on</span>
              <span className="text-[10px] text-slate-400 font-medium">Reduces setup and connection friction</span>
            </div>
            <button
              type="button"
              disabled={internetService === 'No'}
              onClick={() => setTechSupport(techSupport === 'Yes' ? 'No' : 'Yes')}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                techSupport === 'Yes' ? 'bg-blue-600' : 'bg-slate-200'
              } ${internetService === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  techSupport === 'Yes' ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {/* Number of Products */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <label htmlFor="products-input">Number of Active Services</label>
              <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">{numberOfProducts} products</span>
            </div>
            <input 
              id="products-input"
              type="range" 
              min="1" 
              max="6" 
              value={numberOfProducts} 
              onChange={(e) => setNumberOfProducts(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
            </div>
          </div>
          {/* Payment Method */}
          <div className="space-y-1.5">
            <label htmlFor="payment-method-select" className="text-xs font-semibold text-slate-600 block">Payment Method</label>
            <select
              id="payment-method-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none rounded-lg text-xs font-medium text-slate-700 bg-white"
            >
              <option value="Electronic check">Electronic check (Manual transaction)</option>
              <option value="Mailed check">Mailed check (Manual transaction)</option>
              <option value="Bank transfer">Bank transfer (Auto-Pay)</option>
              <option value="Credit card">Credit card (Auto-Pay)</option>
            </select>
          </div>
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running ML Inference...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Predict Churn Risk</span>
              </>
            )}
          </button>
        </form>
        {/* Prediction Results & Explanation (Right) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {error}
            </div>
          )}
          {!result && !loading && (
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-white">
              <InfoIcon className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">Prediction Pending</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Configure the customer attributes on the left and click "Predict Churn Risk" to run the model.</p>
            </div>
          )}
          {loading && (
            <div className="flex-1 bg-white border border-slate-200 rounded-xl card-shadow p-6 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold animate-pulse">Running Logistic Regression & computing SHAP attributions...</p>
            </div>
          )}
          {result && !loading && (
            <>
              {/* Circular Gauge Card */}
              <div className="bg-white border border-slate-200 rounded-xl card-shadow p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* SVG Gauge */}
                <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-5 md:pb-0 md:pr-5">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Background track */}
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="10"
                      />
                      {/* Animated Gauge Ring */}
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="transparent"
                        stroke={getRiskColor(result.probability)}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="gauge-path"
                      />
                    </svg>
                    {/* Centered Probability text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-extrabold text-slate-900">{(result.probability * 100).toFixed(1)}%</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Churn Prob</span>
                    </div>
                  </div>
                  <span className={`mt-3 px-3 py-1 border rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                    result.probability > 0.70 ? 'bg-red-50 text-red-700 border-red-200' :
                    result.probability >= 0.40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {getRiskText(result.probability)}
                  </span>
                </div>
                {/* Risk Explanation Text */}
                <div className="md:col-span-7 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Prediction Summary</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Based on historical user data, this profile exhibits a <span className="font-semibold text-slate-800">{(result.probability * 100).toFixed(0)}% likelihood of cancelling</span> subscription within the next 30 days.
                  </p>
                  
                  {/* Summary of why */}
                  <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-1">Key Churn Markers:</span>
                    {result.shap_values.filter(s => s.value > 0).slice(0, 2).map((s, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span>High risk from <span className="font-semibold text-slate-900">{s.feature}</span> ({s.display_value})</span>
                      </div>
                    ))}
                    {result.shap_values.filter(s => s.value > 0).length === 0 && (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>All indicators are stable and positive.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* SHAP Waterfall Chart Card */}
              <div className="bg-white border border-slate-200 rounded-xl card-shadow p-6 flex flex-col">
                <div className="pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Local Feature Attribution (SHAP Waterfall)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Quantifies how each feature deviates churn risk from baseline average</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded">Additive Units</span>
                </div>
                {/* Central Baseline Chart */}
                <div className="space-y-4">
                  {result.shap_values.map((item, idx) => {
                    const absVal = Math.min(1.5, Math.abs(item.value));
                    const widthPercent = (absVal / 1.5) * 45; // scale relative to 45% container width
                    const isPositive = item.value > 0;
                    
                    return (
                      <div key={idx} className="grid grid-cols-12 items-center gap-2">
                        {/* Feature Name */}
                        <div className="col-span-4 text-xs font-semibold text-slate-700 truncate pr-2">
                          {item.feature}
                          <span className="block text-[10px] font-medium text-slate-400">{item.display_value}</span>
                        </div>
                        {/* Centered Waterfall Bar */}
                        <div className="col-span-8 h-6 relative bg-slate-50 rounded border border-slate-100 flex items-center">
                          {/* Central Line */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-300 z-10" />
                          {isPositive ? (
                            // Positive (Push Churn risk UP) - Right aligned from center
                            <div 
                              className="absolute left-1/2 h-4 bg-red-400/80 rounded-r border-r-2 border-red-500 flex items-center justify-end pr-1 text-[9px] font-bold text-red-950 font-mono shadow-sm"
                              style={{ width: `${widthPercent}%` }}
                            >
                              +{item.value.toFixed(2)}
                            </div>
                          ) : (
                            // Negative (Push Churn risk DOWN) - Left aligned from center
                            <div 
                              className="absolute right-1/2 h-4 bg-emerald-400/80 rounded-l border-l-2 border-emerald-500 flex items-center pl-1 text-[9px] font-bold text-emerald-950 font-mono shadow-sm"
                              style={{ width: `${widthPercent}%` }}
                            >
                              {item.value.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex justify-center space-x-6 text-[10px] font-bold text-slate-400 mt-5 pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-red-400 border border-red-500" />
                    <span>Pushes Risk UP (Increases Churn)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-400 border border-emerald-500" />
                    <span>Pushes Risk DOWN (Increases Retention)</span>
                  </div>
                </div>
              </div>
              {/* Recommendation Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-start space-x-4">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-slate-800">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Retention Strategy Action Plan</span>
                  <h4 className="text-sm font-extrabold text-slate-900">{result.recommendation.action}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    <span className="font-semibold text-slate-700">Trigger Reason:</span> Top churn driver is {result.recommendation.risk_factor}.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    {result.recommendation.details}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
