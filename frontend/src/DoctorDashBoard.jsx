import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doctorAPI, chatAPI } from '../services/api';
import { Users, Calendar, FileText, MessageCircle, LogOut, Search, TrendingUp } from 'lucide-react';

export default function DoctorDashboard() {
  const { user, profile, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('patients');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await doctorAPI.getAssignedPatients();
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (patientId) => {
    try {
      const [detailsRes, chatRes] = await Promise.all([
        doctorAPI.getPatientDetails(patientId),
        chatAPI.getChatHistory(patientId)
      ]);
      setPatientDetails(detailsRes.data);
      setChatMessages(chatRes.data.messages);
      setSelectedPatient(patientId);
    } catch (error) {
      console.error('Failed to load patient details:', error);
    }
  };

  const handleAnalyzePatient = async () => {
    if (!selectedPatient || chatLoading) return;

    setChatLoading(true);
    try {
      const response = await chatAPI.analyzePatient(selectedPatient);
      setChatMessages([...chatMessages, response.data.message]);
    } catch (error) {
      console.error('Failed to analyze patient:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    setChatLoading(true);
    const userMsg = chatInput;
    setChatInput('');

    try {
      const response = await chatAPI.sendMessage(userMsg, selectedPatient);
      setChatMessages([...chatMessages, response.data.user_message, response.data.ai_response]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setChatLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Doctor Dashboard</h1>
            <p className="text-sm text-gray-600">Dr. {profile?.full_name} - {profile?.specialization}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patients List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>My Patients ({patients.length})</span>
                </h2>
              </div>
              <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
                {patients.map((item) => (
                  <button
                    key={item.patient.id}
                    onClick={() => loadPatientDetails(item.patient.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                      selectedPatient === item.patient.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-medium">{item.patient.full_name}</div>
                    <div className="text-sm text-gray-600">
                      {item.patient.gender} • {item.patient.blood_group}
                    </div>
                    {item.latest_metric && (
                      <div className="text-xs text-gray-500 mt-1">
                        Last: {item.latest_metric.metric_type} - {item.latest_metric.value}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2">
            {!selectedPatient ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Select a Patient
                </h3>
                <p className="text-gray-500">
                  Choose a patient from the list to view their details and health data
                </p>
              </div>
            ) : patientDetails ? (
              <div className="space-y-6">
                {/* Patient Header */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{patientDetails.patient.full_name}</h2>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>Age: {patientDetails.patient.date_of_birth ? 
                          Math.floor((new Date() - new Date(patientDetails.patient.date_of_birth)) / 31557600000) : 'N/A'} years
                        </p>
                        <p>Gender: {patientDetails.patient.gender}</p>
                        <p>Blood Group: {patientDetails.patient.blood_group}</p>
                        <p>Phone: {patientDetails.patient.phone}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAnalyzePatient}
                      disabled={chatLoading}
                      className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>AI Analysis</span>
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow">
                  <div className="flex border-b">
                    {['metrics', 'records'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-4 font-medium capitalize ${
                          activeTab === tab
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {/* Metrics Tab */}
                    {activeTab === 'metrics' && (
                      <div>
                        <h3 className="font-semibold mb-4">Health Metrics</h3>
                        <div className="space-y-3">
                          {patientDetails.metrics.slice(0, 10).map((metric) => (
                            <div key={metric.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium capitalize">{metric.metric_type.replace('_', ' ')}</p>
                                <p className="text-sm text-gray-600">{new Date(metric.recorded_at).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">{metric.value} {metric.unit}</p>
                                {metric.notes && <p className="text-xs text-gray-500">{metric.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Records Tab */}
                    {activeTab === 'records' && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold">Medical Records</h3>
                          <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                            Upload New
                          </button>
                        </div>
                        <div className="space-y-3">
                          {patientDetails.records.map((record) => (
                            <div key={record.id} className="p-4 border rounded-lg hover:border-blue-300 transition">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <FileText className="w-5 h-5 text-gray-400 mt-1" />
                                  <div>
                                    <p className="font-medium">{record.title}</p>
                                    <p className="text-sm text-gray-600">{record.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                      <span className="capitalize">{record.record_type}</span>
                                      <span>{new Date(record.uploaded_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <button className="text-blue-500 hover:text-blue-600 text-sm">
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading patient details...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      {selectedPatient && (
        <>
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
                <h3 className="font-semibold">AI Assistant - Patient Analysis</h3>
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
                  placeholder="Ask about this patient..."
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
        </>
      )}
    </div>
  );
}