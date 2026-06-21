import { useEffect, useState } from 'react';
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
import { 
  RefreshCw
} from 'lucide-react';
interface ConfusionMatrix {
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
}
interface FeatureImportance {
  feature: string;
  importance: number;
}
interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  confusion_matrix: ConfusionMatrix;
  roc_curve: Array<{ fpr: number; tpr: number }>;
  feature_importance: FeatureImportance[];
}
export function ModelPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/model/performance');
      if (!res.ok) {
        throw new Error('Failed to retrieve model performance metrics.');
      }
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while loading model evaluation.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMetrics();
  }, []);
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Running model validation metrics...</p>
      </div>
    );
  }
  if (error || !metrics) {
    return (
      <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 max-w-lg mx-auto my-10">
        {error || 'Failed to load model metrics.'}
      </div>
    );
  }
  // Prep ROC curve data by injecting baseline diagonal line points
  const rocChartData = metrics.roc_curve.map(pt => ({
    ...pt,
    baseline: pt.fpr // random classifier line y = x
  }));
  // Top 10 Feature Importances
  const topFeatures = metrics.feature_importance.slice(0, 10);
  // Compute confusion matrix aggregates
  const totalPreds = 
    metrics.confusion_matrix.true_negative +
    metrics.confusion_matrix.false_positive +
    metrics.confusion_matrix.false_negative +
    metrics.confusion_matrix.true_positive;
  const pct = (val: number) => ((val / totalPreds) * 100).toFixed(1) + "%";
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Machine Learning Model Performance</h1>
        <p className="text-sm text-slate-500 mt-1">Detailed mathematical evaluation of the active Logistic Regression churn classifier.</p>
      </div>
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Accuracy */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{(metrics.accuracy * 100).toFixed(1)}%</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Correct ratio overall</span>
        </div>
        {/* Precision */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precision</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{(metrics.precision * 100).toFixed(1)}%</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">True positive target</span>
        </div>
        {/* Recall */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recall (Sensitivity)</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{(metrics.recall * 100).toFixed(1)}%</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Captured churn coverage</span>
        </div>
        {/* F1-Score */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">F1-Score</span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{(metrics.f1_score * 100).toFixed(1)}%</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Balanced harmonic mean</span>
        </div>
        {/* AUC-ROC */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AUC-ROC</span>
          <h3 className="text-2xl font-extrabold text-blue-600 mt-1">{metrics.auc_roc.toFixed(2)}</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Classifier separability</span>
        </div>
      </div>
      {/* Performance Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ROC Curve Chart */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col h-[350px]">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Receiver Operating Characteristic (ROC)</h3>
            <p className="text-xs text-slate-400 mt-0.5">FPR vs. TPR curve (Target Area Under Curve = {metrics.auc_roc.toFixed(2)})</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="fpr" 
                  type="number"
                  domain={[0, 1]} 
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(v) => v.toFixed(1)} 
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-xs font-medium text-slate-700">
                          <p className="text-slate-900 font-bold">Classifier Separability</p>
                          <p className="text-blue-600 mt-1">True Positive Rate (TPR): {(data.tpr * 100).toFixed(1)}%</p>
                          <p className="text-slate-500">False Positive Rate (FPR): {(data.fpr * 100).toFixed(1)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" fontSize={11} />
                <Line name="Model ROC Curve" type="monotone" dataKey="tpr" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                <Line name="Random Baseline" type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Global Feature Importance Chart */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl card-shadow flex flex-col h-[350px]">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Global Feature Importance (SHAP Mean Absolute impact)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Top 10 features driving subscription classification weights</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topFeatures} 
                layout="vertical"
                margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis 
                  dataKey="feature" 
                  type="category" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  width={110}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-xs">
                          <p className="font-bold text-slate-900">{data.feature}</p>
                          <p className="text-blue-600 mt-1">Mean Absolute SHAP: <span className="font-extrabold">{data.importance.toFixed(3)}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="importance" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Confusion Matrix Section */}
      <div className="bg-white border border-slate-200 rounded-xl card-shadow p-5 space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Confusion Matrix Grid</h3>
          <p className="text-xs text-slate-400 mt-0.5">Quantifies predictions against true classification outcomes in the test set ({totalPreds} samples)</p>
        </div>
        {/* 2x2 Colored Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto py-2">
          
          {/* True Negative */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-col justify-between h-28">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block">True Negative (TN)</span>
              <p className="text-[11px] text-emerald-700/80 font-medium mt-1 leading-tight">Correctly classified active customers who remained subscribed.</p>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-800">{metrics.confusion_matrix.true_negative}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded">{pct(metrics.confusion_matrix.true_negative)}</span>
            </div>
          </div>
          {/* False Positive */}
          <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl flex flex-col justify-between h-28">
            <div>
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block">False Positive (FP - Type I Error)</span>
              <p className="text-[11px] text-rose-700/80 font-medium mt-1 leading-tight">Predicted to churn, but actually remained active (False Alarm).</p>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-800">{metrics.confusion_matrix.false_positive}</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded">{pct(metrics.confusion_matrix.false_positive)}</span>
            </div>
          </div>
          {/* False Negative */}
          <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl flex flex-col justify-between h-28">
            <div>
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block">False Negative (FN - Type II Error)</span>
              <p className="text-[11px] text-rose-700/80 font-medium mt-1 leading-tight">Predicted to remain active, but actually churned (Missed Churn).</p>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-800">{metrics.confusion_matrix.false_negative}</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded">{pct(metrics.confusion_matrix.false_negative)}</span>
            </div>
          </div>
          {/* True Positive */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-col justify-between h-28">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block">True Positive (TP)</span>
              <p className="text-[11px] text-emerald-700/80 font-medium mt-1 leading-tight">Correctly classified high-risk customers who subsequently cancelled.</p>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-800">{metrics.confusion_matrix.true_positive}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded">{pct(metrics.confusion_matrix.true_positive)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
