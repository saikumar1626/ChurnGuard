import { useEffect, useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Legend
} from 'recharts';
interface MetricData {
  total_customers: number;
  high_risk_count: number;
  medium_risk_count: number;
  revenue_at_risk: number;
}
interface ChartData {
  segments_internet: Array<{ segment: string; count: number; avg_churn: number }>;
  segments_contract: Array<{ segment: string; count: number; avg_churn: number }>;
  churn_trend: Array<{ month: string; churn_rate: number; high_risk_revenue: number }>;
}
interface Customer {
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
interface DashboardHomeProps {
  onReset: () => void;
  isLoadingReset: boolean;
}
export function DashboardHome({ onReset, isLoadingReset }: DashboardHomeProps) {
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [highRisk, setHighRisk] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentType, setSegmentType] = useState<'internet' | 'contract'>('internet');
  const [searchTerm, setSearchTerm] = useState('');
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, cRes, hRes] = await Promise.all([
        fetch('/api/dashboard/metrics'),
        fetch('/api/dashboard/charts'),
        fetch('/api/dashboard/high-risk')
      ]);
      if (!mRes.ok || !cRes.ok || !hRes.ok) {
        throw new Error('Failed to load dashboard data. Please verify backend state.');
      }
      const mData = await mRes.json();
      const cData = await cRes.json();
      const hData = await hRes.json();
      setMetrics(mData);
      setCharts(cData);
      setHighRisk(hData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching dashboard details.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [isLoadingReset]);
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Analyzing subscription portfolio data...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 max-w-xl mx-auto my-10">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-800">Connection Failure</h3>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }
  const filteredHighRisk = highRisk.filter(c => 
    c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contract_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.top_risk_factor.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const getRiskBadgeColor = (prob: number) => {
    if (prob > 0.70) return 'bg-red-50 text-red-700 border-red-200';
    if (prob >= 0.40) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };
  const getSHAPColorClass = (factor: string) => {
    if (factor === 'None') return 'text-slate-500 font-medium';
    return 'text-slate-700 font-semibold';
  };
  const activeSegmentData = segmentType === 'internet' 
    ? charts?.segments_internet 
    : charts?.segments_contract;
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ChurnGuard — Customer Retention Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time cohort tracking, risk evaluation, and algorithmic explanations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={onReset}
            disabled={isLoadingReset}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            {isLoadingReset ? 'Resetting...' : 'Reset to Baseline'}
          </button>
        </div>
      </div>
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Customers */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Analyzed</span>
            <h3 className="text-3xl font-extrabold text-slate-900">{metrics?.total_customers.toLocaleString()}</h3>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              <span>+4.2% from last month</span>
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
        </div>
        {/* High Risk */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">High Risk (&gt;70%)</span>
            <h3 className="text-3xl font-extrabold text-red-600">{metrics?.high_risk_count}</h3>
            <span className="text-[11px] text-red-600 font-medium flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              <span>{((metrics?.high_risk_count || 0) / (metrics?.total_customers || 1) * 100).toFixed(1)}% of user base</span>
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
        {/* Medium Risk */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Medium Risk (40-70%)</span>
            <h3 className="text-3xl font-extrabold text-amber-600">{metrics?.medium_risk_count}</h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Requires immediate active touchpoint
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
        {/* Revenue at Risk */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue at Risk</span>
            <h3 className="text-3xl font-extrabold text-slate-900">₹{(metrics?.revenue_at_risk || 0).toLocaleString('en-IN')}</h3>
            <span className="text-[11px] text-red-600 font-medium flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              <span>Monthly high-risk recurring</span>
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
            <span className="text-lg font-bold">₹</span>
          </div>
        </div>
      </div>
      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Segment Churn Distribution */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col h-[350px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Risk Across Cohort Segments</h3>
              <p className="text-xs text-slate-400 mt-0.5">Average predicted churn probability (%)</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button 
                onClick={() => setSegmentType('internet')}
                className={`px-2.5 py-1 font-semibold rounded-md transition ${segmentType === 'internet' ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Internet
              </button>
              <button 
                onClick={() => setSegmentType('contract')}
                className={`px-2.5 py-1 font-semibold rounded-md transition ${segmentType === 'contract' ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Contract
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeSegmentData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="segment" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                          <p className="text-xs font-bold text-slate-900">{data.segment}</p>
                          <p className="text-xs text-slate-500 mt-1">Average Churn Probability: <span className="font-bold text-blue-600">{data.avg_churn}%</span></p>
                          <p className="text-xs text-slate-400">Cohort Size: {data.count} customers</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avg_churn" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Churn Trend Over Last 6 Months */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col h-[350px]">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Historical Churn Risk Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">Average churn rate and monthly revenue-at-risk</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.churn_trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#3B82F6" fontSize={11} tickLine={false} unit="%" />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} tickLine={false} unit="₹" />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                          <p className="text-xs font-bold text-slate-900">{data.month}</p>
                          <p className="text-xs text-blue-600 mt-1">Churn Rate: <span className="font-bold">{data.churn_rate}%</span></p>
                          <p className="text-xs text-red-500">Revenue at Risk: <span className="font-bold">₹{data.high_risk_revenue.toLocaleString('en-IN')}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" fontSize={11} />
                <Line yAxisId="left" name="Avg Churn Rate (%)" type="monotone" dataKey="churn_rate" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" name="Revenue at Risk (₹)" type="monotone" dataKey="high_risk_revenue" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Top 20 High-Risk Customers Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl card-shadow overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Top 20 Critical High-Risk Subscriptions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Prioritized customer cohorts sorted by prediction risk index</p>
          </div>
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by ID, contract, factor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-700 bg-slate-50/50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
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
              {filteredHighRisk.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No customers match the active filters.
                  </td>
                </tr>
              ) : (
                filteredHighRisk.map((cust) => (
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
                        <span className={getSHAPColorClass(cust.top_risk_factor)}>{cust.top_risk_factor}</span>
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
  );
}
