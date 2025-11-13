import { useState, useEffect } from 'react';
import { Activity, Heart, Droplet, Thermometer, Wind, TrendingUp, Moon, Footprints, Flame, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { patientAPI, doctorAPI } from '../services/api';

export default function AutoMetricsDashboard({ isDoctor = false, patientId = null }) {
  const [allMetrics, setAllMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('heartbeat');
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadAllMetrics();
  }, [patientId, selectedPeriod]);

  const loadAllMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      
      if (isDoctor && patientId) {
        // Doctor viewing patient metrics
        response = await doctorAPI.getPatientHealthMetrics(patientId, null, 10000);
      } else {
        // Patient viewing own metrics
        response = await patientAPI.getHealthMetrics(null, 10000);
      }
      
      console.log('📊 Metrics loaded:', response.data.metrics?.length || 0, 'total records');
      
      // Log date range
      if (response.data.metrics && response.data.metrics.length > 0) {
        const dates = response.data.metrics.map(m => new Date(m.recorded_at));
        const oldest = new Date(Math.min(...dates));
        const newest = new Date(Math.max(...dates));
        console.log('📅 Date range:', oldest.toLocaleDateString(), 'to', newest.toLocaleDateString());
        
        // Log metrics by type
        const byType = {};
        response.data.metrics.forEach(m => {
          byType[m.metric_type] = (byType[m.metric_type] || 0) + 1;
        });
        console.log('📈 Metrics by type:', byType);
      }
      
      setAllMetrics(response.data.metrics || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load health metrics');
      setAllMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  // Get latest value for each metric type
  const getLatestMetrics = () => {
    const latestByType = {};
    
    allMetrics.forEach(metric => {
      if (!latestByType[metric.metric_type] || 
          new Date(metric.recorded_at) > new Date(latestByType[metric.metric_type].recorded_at)) {
        latestByType[metric.metric_type] = metric;
      }
    });
    
    return latestByType;
  };

  // Get chart data for selected metric and period
  const getChartData = () => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (selectedPeriod * 24 * 60 * 60 * 1000));
    
    const filtered = allMetrics
      .filter(m => m.metric_type === selectedMetric)
      .filter(m => new Date(m.recorded_at) >= cutoffDate)
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    // Group by day and calculate averages to avoid cluttered charts
    const dailyData = {};
    
    filtered.forEach(m => {
      const date = new Date(m.recorded_at);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          date: date,
          values: [],
          systolic: [],
          diastolic: []
        };
      }
      
      if (selectedMetric === 'blood_pressure' && m.value.includes('/')) {
        const [sys, dia] = m.value.split('/').map(v => parseInt(v));
        if (!isNaN(sys) && !isNaN(dia)) {
          dailyData[dayKey].systolic.push(sys);
          dailyData[dayKey].diastolic.push(dia);
        }
      } else {
        const numValue = parseFloat(m.value);
        if (!isNaN(numValue)) {
          dailyData[dayKey].values.push(numValue);
        }
      }
    });

    // Convert to array and calculate averages
    return Object.keys(dailyData).sort().map(dayKey => {
      const data = dailyData[dayKey];
      const date = data.date;
      const display_date = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (selectedMetric === 'blood_pressure') {
        const avgSystolic = data.systolic.length > 0 
          ? Math.round(data.systolic.reduce((a, b) => a + b, 0) / data.systolic.length)
          : 0;
        const avgDiastolic = data.diastolic.length > 0
          ? Math.round(data.diastolic.reduce((a, b) => a + b, 0) / data.diastolic.length)
          : 0;
        
        return {
          date: dayKey,
          display_date,
          systolic: avgSystolic,
          diastolic: avgDiastolic,
          time: date.toLocaleDateString('en-US', { weekday: 'short' })
        };
      }
      
      const avgValue = data.values.length > 0
        ? data.values.reduce((a, b) => a + b, 0) / data.values.length
        : 0;
      
      return {
        date: dayKey,
        display_date,
        value: Math.round(avgValue * 10) / 10, // Round to 1 decimal
        unit: filtered[0]?.unit || '',
        time: date.toLocaleDateString('en-US', { weekday: 'short' })
      };
    });
  };

  const latestMetrics = getLatestMetrics();
  const chartData = getChartData();

  const metricCards = [
    {
      key: 'heartbeat',
      label: 'Heart Rate',
      icon: <Heart className="w-6 h-6" />,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      normalRange: '60-100 bpm',
      chartColor: '#ef4444'
    },
    {
      key: 'blood_pressure',
      label: 'Blood Pressure',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      normalRange: '90/60 - 120/80',
      chartColor: '#3b82f6'
    },
    {
      key: 'temperature',
      label: 'Temperature',
      icon: <Thermometer className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      normalRange: '97.8°F - 99.1°F',
      chartColor: '#f97316'
    },
    {
      key: 'blood_oxygen',
      label: 'Blood Oxygen',
      icon: <Wind className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      normalRange: '95% - 100%',
      chartColor: '#22c55e'
    },
    {
      key: 'sugar_level',
      label: 'Blood Sugar',
      icon: <Droplet className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      normalRange: '70-140 mg/dL',
      chartColor: '#a855f7'
    },
    {
      key: 'steps',
      label: 'Steps',
      icon: <Footprints className="w-6 h-6" />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      normalRange: '8,000 - 10,000',
      chartColor: '#6366f1'
    },
    {
      key: 'calories',
      label: 'Calories Burned',
      icon: <Flame className="w-6 h-6" />,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      normalRange: '1,800 - 2,500',
      chartColor: '#eab308'
    },
    {
      key: 'sleep_hours',
      label: 'Sleep Duration',
      icon: <Moon className="w-6 h-6" />,
      color: 'from-slate-500 to-gray-600',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      normalRange: '7-9 hours',
      chartColor: '#64748b'
    }
  ];

  const selectedMetricConfig = metricCards.find(m => m.key === selectedMetric);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading health metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Metrics</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadAllMetrics}
          className="inline-flex items-center space-x-2 bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Health Metrics Dashboard</h3>
            {lastUpdate && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Total metrics: {allMetrics.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 mr-2">Time Period:</span>
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedPeriod === days
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {days} Days
              </button>
            ))}
            <button
              onClick={loadAllMetrics}
              className="ml-2 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {allMetrics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Health Data Available</h3>
          <p className="text-gray-500 mb-4">
            {isDoctor 
              ? 'This patient has no recorded health metrics yet.'
              : 'You have no recorded health metrics yet.'
            }
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-md mx-auto mb-4">
            <p className="text-sm text-gray-600 mb-2">To generate sample data, run:</p>
            <code className="bg-gray-800 text-green-400 px-3 py-2 rounded block text-sm font-mono">
              python generate_90day_metrics.py
            </code>
          </div>
          <button
            onClick={loadAllMetrics}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricCards.map((card) => {
              const metric = latestMetrics[card.key];
              const isActive = selectedMetric === card.key;
              
              return (
                <button
                  key={card.key}
                  onClick={() => setSelectedMetric(card.key)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isActive 
                      ? 'border-blue-500 shadow-lg scale-105 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                      <div className="text-white">{card.icon}</div>
                    </div>
                    {metric && (
                      <span className="text-xs text-gray-500">
                        {new Date(metric.recorded_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-1 font-medium">{card.label}</p>
                  {metric ? (
                    <>
                      <p className="text-2xl font-bold text-gray-800">
                        {metric.value} <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Normal: {card.normalRange}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No data</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chart Section */}
          {selectedMetricConfig && chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedMetricConfig.color}`}>
                    <div className="text-white">{selectedMetricConfig.icon}</div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">{selectedMetricConfig.label} Trend</h4>
                    <p className="text-sm text-gray-500">Last {selectedPeriod} days ({chartData.length} data points)</p>
                  </div>
                </div>
                <div className={`px-4 py-2 ${selectedMetricConfig.bgColor} ${selectedMetricConfig.textColor} rounded-lg font-medium text-sm`}>
                  Normal: {selectedMetricConfig.normalRange}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`color-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedMetricConfig.chartColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={selectedMetricConfig.chartColor} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="color-systolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="color-diastolic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="display_date" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    domain={selectedMetric === 'blood_pressure' ? [60, 140] : ['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  {selectedMetric === 'blood_pressure' ? (
                    <>
                      <Area 
                        type="monotone" 
                        dataKey="systolic" 
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#color-systolic)"
                        name="Systolic"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="diastolic" 
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#color-diastolic)"
                        name="Diastolic"
                      />
                      <Legend />
                    </>
                  ) : (
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={selectedMetricConfig.chartColor}
                      strokeWidth={3}
                      fill={`url(#color-${selectedMetric})`}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>

              {/* Recent Readings Table */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Recent Daily Averages</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {chartData.slice(-8).reverse().map((reading, idx) => (
                    <div key={idx} className={`p-3 ${selectedMetricConfig.bgColor} rounded-lg`}>
                      <p className="text-xs text-gray-600 mb-1 font-medium">{reading.display_date}</p>
                      <p className="text-xs text-gray-500 mb-1">{reading.time}</p>
                      <p className={`text-lg font-bold ${selectedMetricConfig.textColor}`}>
                        {selectedMetric === 'blood_pressure' 
                          ? `${reading.systolic}/${reading.diastolic}`
                          : reading.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No data for selected metric */}
          {selectedMetricConfig && chartData.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-700 mb-2">
                No {selectedMetricConfig.label} Data
              </h4>
              <p className="text-gray-500">
                No data available for this metric in the selected time period
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}