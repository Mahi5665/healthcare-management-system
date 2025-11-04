import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { patientAPI, chatAPI } from '../services/api';
import { Heart, Activity, Thermometer, Droplet, Moon, Upload, MessageCircle, Calendar, FileText, LogOut } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PatientDashboard() {
  const { user, profile, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, metricsRes, chatRes] = await Promise.all([
        patientAPI.getDashboardSummary(),
        patientAPI.getHealthMetrics(),
        chatAPI.getChatHistory()
      ]);
      
      setDashboardData(dashboardRes.data);
      setMetrics(metricsRes.data.metrics);
      setChatMessages(chatRes.data.messages);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    setChatLoading(true);
    const userMsg = chatInput;
    setChatInput('');

    try {
      const response = await chatAPI.sendMessage(userMsg);
      setChatMessages([...chatMessages, response.data.user_message, response.data.ai_response]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const getMetricIcon = (type) => {
    const icons = {
      heartbeat: Heart,
      blood_pressure: Activity,
      temperature: Thermometer,
      sugar_level: Droplet,
      sleep_hours: Moon,
    };
    const Icon = icons[type] || Activity;
    return <Icon className="w-6 h-6" />;
  };

  const getMetricColor = (type) => {
    const colors = {
      heartbeat: 'bg-red-100 text-red-600',
      blood_pressure: 'bg-blue-100 text-blue-600',
      temperature: 'bg-orange-100 text-orange-600',
      sugar_level: 'bg-purple-100 text-purple-600',
      sleep_hours: 'bg-indigo-100 text-indigo-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Patient Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {profile?.full_name}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            {['overview', 'metrics', 'records', 'appointments', 'doctors'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Latest Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData?.latest_metrics && Object.entries(dashboardData.latest_metrics).map(([key, metric]) => (
                <div key={key} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                      <p className="text-3xl font-bold mt-2">{metric.value} {metric.unit}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(metric.recorded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${getMetricColor(key)}`}>
                      {getMetricIcon(key)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{dashboardData?.record_count || 0}</p>
                    <p className="text-sm text-gray-600">Medical Records</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <Activity className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{dashboardData?.doctor_count || 0}</p>
                    <p className="text-sm text-gray-600">Assigned Doctors</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.length}</p>
                    <p className="text-sm text-gray-600">Health Entries</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Metrics Chart */}
            {metrics.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Health Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.slice(0, 10).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="recorded_at" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Health Metrics</h2>
              <button
                onClick={() => setShowAddMetric(!showAddMetric)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Add Metric
              </button>
            </div>

            {showAddMetric && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Add New Metric</h3>
                <AddMetricForm onSuccess={() => { setShowAddMetric(false); loadDashboard(); }} />
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.map((metric) => (
                    <tr key={metric.id}>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">{metric.metric_type.replace('_', ' ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{metric.value} {metric.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(metric.recorded_at).toLocaleString()}</td>
                      <td className="px-6 py-4">{metric.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-lg shadow-2xl border">
          <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">AI Health Assistant</h3>
            <button onClick={() => setShowChat(false)} className="text-white hover:text-gray-200">×</button>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-3 rounded-lg ${
                  msg.message_type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={chatLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddMetricForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    metric_type: 'heartbeat',
    value: '',
    unit: 'bpm',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await patientAPI.addHealthMetric(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to add metric:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={formData.metric_type}
            onChange={(e) => setFormData({...formData, metric_type: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="heartbeat">Heartbeat</option>
            <option value="blood_pressure">Blood Pressure</option>
            <option value="temperature">Temperature</option>
            <option value="sugar_level">Sugar Level</option>
            <option value="sleep_hours">Sleep Hours</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Value</label>
          <input
            type="text"
            value={formData.value}
            onChange={(e) => setFormData({...formData, value: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Unit</label>
        <input
          type="text"
          value={formData.unit}
          onChange={(e) => setFormData({...formData, unit: e.target.value})}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="w-full px-3 py-2 border rounded-lg"
          rows="2"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
      >
        Add Metric
      </button>
    </form>
  );
}