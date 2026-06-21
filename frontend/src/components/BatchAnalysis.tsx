import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Search
} from 'lucide-react';
interface BatchCustomer {
  customer_id: string;
  tenure: number;
  monthly_charges: number;
  contract_type: string;
  internet_service: string;
  tech_support: string;
  number_of_products: number;
  payment_method: string;
  churn_probability: number;
  top_risk_factor: string;
}
interface BatchResult {
  total_analyzed: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  predictions: BatchCustomer[];
}
export function BatchAnalysis() {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };
  const uploadFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/predict/batch", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error processing batch CSV file. Ensure columns match the model schema.");
      }
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during batch execution.");
    } finally {
      setLoading(false);
    }
  };
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  // Triggers client-side CSV download of the predictions
  const downloadReport = () => {
    if (!result) return;
    
    // Construct CSV Header
    const csvRows = [
      ["Customer ID", "Tenure (Months)", "Monthly Charges (INR)", "Contract Type", "Internet Service", "Tech Support", "Number of Products", "Payment Method", "Churn Probability", "Top Risk Factor"]
    ];
    // Add row contents
    result.predictions.forEach(c => {
      csvRows.push([
        c.customer_id,
        c.tenure.toString(),
        c.monthly_charges.toFixed(2),
        c.contract_type,
        c.internet_service,
        c.tech_support,
        c.number_of_products.toString(),
        c.payment_method,
        (c.churn_probability * 100).toFixed(2) + "%",
        c.top_risk_factor
      ]);
    });
    // Build CSV string
    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ChurnGuard_Batch_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const getRiskBadgeColor = (prob: number) => {
    if (prob > 0.70) return 'bg-red-50 text-red-700 border-red-200';
    if (prob >= 0.40) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };
  const filteredPredictions = result?.predictions.filter(c => 
    c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contract_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.top_risk_factor.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Batch Churn Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Upload a customer list in CSV format to calculate churn risks and export retention reports.</p>
      </div>
      {/* CSV Drag and Drop Uploader */}
      <div 
        onDragEnter={handleDrag} 
        onDragOver={handleDrag} 
        onDragLeave={handleDrag} 
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
          dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv" 
          onChange={handleChange}
          className="hidden" 
        />
        
        {loading ? (
          <div className="space-y-3">
            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Processing Batch Upload...</p>
            <p className="text-xs text-slate-400">Running profile transformations and scoring models...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <UploadCloud className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Drag and drop your customer CSV file here</p>
            <p className="text-xs text-slate-400">Or click to browse from your device. Supported headers: Customer ID, Tenure, Charges, Contract, Internet, Support, Products, Payment</p>
          </div>
        )}
      </div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      {/* Uploaded Results View */}
      {result && (
        <div className="space-y-6">
          
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl card-shadow p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Analyzed</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{result.total_analyzed}</h3>
              </div>
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl card-shadow p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">High Risk</span>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{result.high_risk_count}</h3>
              </div>
              <div className="h-10 w-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl card-shadow p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Medium Risk</span>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{result.medium_risk_count}</h3>
              </div>
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl card-shadow p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Risk</span>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{result.low_risk_count}</h3>
              </div>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </div>
          {/* Results Table Panel */}
          <div className="bg-white border border-slate-200 rounded-xl card-shadow overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Batch Processing Results</h3>
                <p className="text-xs text-slate-400 mt-0.5">Scored churn probabilities for uploaded cohort profiles</p>
              </div>
              
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                {/* Search field */}
                <div className="relative flex-1 sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search results..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-700 bg-slate-50/50"
                  />
                </div>
                {/* Download button */}
                <button
                  onClick={downloadReport}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center space-x-2 shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Customer ID</th>
                    <th className="p-4">Tenure</th>
                    <th className="p-4">Monthly Charges</th>
                    <th className="p-4">Contract Type</th>
                    <th className="p-4">Internet Type</th>
                    <th className="p-4 text-center">Churn Probability</th>
                    <th className="p-4">SHAP Risk Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPredictions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        No customer profiles match active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPredictions.map((cust) => (
                      <tr key={cust.customer_id} className="hover:bg-slate-50/50 transition font-medium">
                        <td className="p-4 font-mono font-bold text-slate-900">{cust.customer_id}</td>
                        <td className="p-4">{cust.tenure} months</td>
                        <td className="p-4">₹{cust.monthly_charges.toFixed(2)}</td>
                        <td className="p-4">{cust.contract_type}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            cust.internet_service === 'Fiber optic' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            cust.internet_service === 'DSL' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {cust.internet_service}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getRiskBadgeColor(cust.churn_probability)}`}>
                            {(cust.churn_probability * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${cust.top_risk_factor !== 'None' ? 'bg-red-500' : 'bg-slate-300'}`} />
                            <span className="font-semibold">{cust.top_risk_factor}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
