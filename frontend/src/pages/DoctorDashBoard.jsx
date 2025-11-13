import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doctorAPI, chatAPI, authAPI } from '../services/api';
import { Users, Calendar, FileText, MessageCircle, LogOut, Search, TrendingUp, Bell, CheckCircle, XCircle, Clock, Activity, AlertCircle, User, Settings, ChevronRight, Trash2, X, Plus, Mail, Phone, Droplet, Send, Eye, Download } from 'lucide-react';
import SettingsModal from './SettingsModal';
import AutoMetricsDashboard from './AutoMetricsDashboard';
import { useNavigate } from 'react-router-dom';

export default function EnhancedDoctorDashboard() {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsTab, setDetailsTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [removingPatient, setRemovingPatient] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [approvingAppointment, setApprovingAppointment] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const navigate = useNavigate();
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: ''
  });

  const [patients, setPatients] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [patientDetails, setPatientDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading doctor dashboard...');
      
      const [patientsRes, requestsRes, appointmentsRes, pendingApptRes, notificationsRes] = await Promise.all([
        doctorAPI.getAssignedPatients(),
        doctorAPI.getPendingRequests(),
        doctorAPI.getAppointments(),
        doctorAPI.getPendingAppointments(),
        doctorAPI.getNotifications()
      ]);
      
      setPatients(patientsRes.data.patients || []);
      setPendingRequests(requestsRes.data.requests || []);
      setAppointments(appointmentsRes.data.appointments || []);
      setPendingAppointments(pendingApptRes.data.appointments || []);
      setNotifications(notificationsRes.data.notifications || []);

      const hasUnread = (pendingApptRes.data.appointments || []).length > 0 ||
                        (requestsRes.data.requests || []).length > 0 ||
                        (notificationsRes.data.notifications || []).length > 0;
      setHasUnreadNotifications(hasUnread);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await doctorAPI.getNotifications();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      const response = await authAPI.updateProfile(updatedData);
      window.location.reload();
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteAccount = async () => {
  try {
    await authAPI.deleteAccount();
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to login
    navigate('/login');
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw error;
  }
};

  const loadPatientDetails = async (patientId) => {
    setSelectedPatient(patientId);
    setPatientDetails(null);
    setChatMessages([]); // Clear previous chat
    
    try {
      console.log('📋 Loading patient details for ID:', patientId);
      
      // Load patient details and health files - skip chat history if it fails
      const [detailsRes, healthFilesRes] = await Promise.all([
        doctorAPI.getPatientDetails(patientId),
        doctorAPI.getPatientHealthFiles(patientId)
      ]);
      
      console.log('✅ Patient details loaded:', detailsRes.data);
      console.log('✅ Health files loaded:', healthFilesRes.data);
      
      setPatientDetails({
        ...detailsRes.data,
        healthFiles: healthFilesRes.data.files || []
      });

      // Try to load chat history separately
      try {
        const chatRes = await chatAPI.getChatHistory(patientId);
        console.log('✅ Chat history loaded:', chatRes.data);
        setChatMessages(chatRes.data.messages || []);
      } catch (chatError) {
        console.warn('⚠️ Chat history not available:', chatError);
        setChatMessages([]);
      }
      
    } catch (error) {
      console.error('❌ Failed to load patient details:', error);
      alert('Failed to load patient details: ' + (error.response?.data?.error || error.message));
      setPatientDetails({ patient: patients.find(p => p.patient.id === patientId)?.patient, metrics: [], records: [], healthFiles: [] });
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setRequestsLoading(true);
    try {
      await doctorAPI.acceptPatientRequest(requestId);
      alert('Patient request accepted successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert(error.response?.data?.error || 'Failed to accept request');
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!confirm('Are you sure you want to reject this request?')) return;
    
    setRequestsLoading(true);
    try {
      await doctorAPI.rejectPatientRequest(requestId);
      alert('Patient request rejected');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRemovePatient = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this patient? You will no longer have access to their health data.')) {
      return;
    }

    setRemovingPatient(true);
    try {
      await doctorAPI.removePatientAssignment(assignmentId);
      alert('Patient removed successfully');
      setSelectedPatient(null);
      setPatientDetails(null);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to remove patient:', error);
      alert(error.response?.data?.error || 'Failed to remove patient');
    } finally {
      setRemovingPatient(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading || !selectedPatient) return;

    setChatLoading(true);
    const userMsg = chatInput;
    setChatInput('');

    try {
      const response = await chatAPI.sendMessage(userMsg, selectedPatient);
      setChatMessages([...chatMessages, response.data.user_message, response.data.ai_response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message: ' + (error.response?.data?.error || error.message));
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyzePatient = async () => {
    if (!selectedPatient || chatLoading) return;

    setChatLoading(true);
    try {
      const response = await chatAPI.analyzePatient(selectedPatient);
      setChatMessages([...chatMessages, response.data.message]);
      setShowChat(true);
    } catch (error) {
      console.error('Failed to analyze patient:', error);
      alert('Failed to analyze patient: ' + (error.response?.data?.error || error.message));
    } finally {
      setChatLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!appointmentForm.patient_id || !appointmentForm.appointment_date || !appointmentForm.appointment_time) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await doctorAPI.bookAppointment({
        ...appointmentForm,
        appointment_datetime: `${appointmentForm.appointment_date} ${appointmentForm.appointment_time}`
      });
      alert('Appointment scheduled successfully!');
      setShowAppointmentModal(false);
      setAppointmentForm({
        patient_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: ''
      });
      loadDashboardData();
    } catch (error) {
      console.error('Failed to book appointment:', error);
      alert(error.response?.data?.error || 'Failed to book appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setCancellingAppointment(true);
    try {
      await doctorAPI.updateAppointmentStatus(appointmentId, 'cancelled', 'Cancelled by doctor');
      alert('Appointment cancelled successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      alert(error.response?.data?.error || 'Failed to cancel appointment');
    } finally {
      setCancellingAppointment(false);
    }
  };

  const handleApproveAppointment = async (appointmentId) => {
    setApprovingAppointment(true);
    try {
      await doctorAPI.approveAppointment(appointmentId);
      alert('Appointment approved successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to approve appointment:', error);
      alert(error.response?.data?.error || 'Failed to approve appointment');
    } finally {
      setApprovingAppointment(false);
    }
  };

  const handleRejectAppointment = async (appointmentId) => {
    const notes = prompt('Reason for rejection (optional):');
    if (notes === null) return;
    
    setApprovingAppointment(true);
    try {
      await doctorAPI.rejectAppointment(appointmentId, notes);
      alert('Appointment rejected');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to reject appointment:', error);
      alert(error.response?.data?.error || 'Failed to reject appointment');
    } finally {
      setApprovingAppointment(false);
    }
  };

  const handleViewFile = async (fileId) => {
    setLoadingFile(true);
    try {
      console.log('📂 Viewing file:', fileId, 'for patient:', selectedPatient);
      const response = await doctorAPI.viewHealthFile(selectedPatient, fileId);
      console.log('✅ File content loaded:', response.data);
      setFileContent(response.data);
      setViewingFile(fileId);
    } catch (error) {
      console.error('❌ Failed to load file:', error);
      alert('Failed to load file content: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDownloadFile = async (fileId, filename) => {
    try {
      console.log('⬇️ Downloading file:', fileId, filename);
      const response = await doctorAPI.downloadHealthFile(selectedPatient, fileId);
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ File downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download file:', error);
      alert('Failed to download file: ' + (error.response?.data?.error || error.message));
    }
  };

  const closeFileViewer = () => {
    setViewingFile(null);
    setFileContent(null);
  };

  const getAppointmentStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-orange-100 text-orange-800', text: 'Pending Approval' },
      approved: { color: 'bg-blue-100 text-blue-800', text: 'Approved' },
      scheduled: { color: 'bg-blue-100 text-blue-800', text: 'Scheduled' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const filteredPatients = patients
    .map(item => item.patient)
    .filter(patient => {
      if (!patient) return false;
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const fullName = (patient.full_name || '').toLowerCase();
      const email = (patient.email || '').toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Doctor Dashboard</h1>
                <p className="text-sm text-gray-600">{profile?.full_name} - {profile?.specialization}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    setHasUnreadNotifications(false);
                  }
                }}
                className="relative p-3 hover:bg-blue-50 rounded-xl transition group"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition" />
                {hasUnreadNotifications && (
                  <span className="absolute top-2 right-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                  </span>
                )}
              </button>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {showNotifications && (
        <div className="fixed top-20 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingAppointments.length === 0 && 
            pendingRequests.length === 0 && 
            appointments.filter(a => {
              const apptDate = new Date(a.appointment_datetime || a.appointment_date);
              const today = new Date();
              return apptDate.toDateString() === today.toDateString() && 
                      (a.status === 'approved' || a.status === 'scheduled');
            }).length === 0 &&
            notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Users />} label="Total Patients" value={patients.length} color="blue" />
          <StatCard icon={<Calendar />} label="Appointments" value={appointments.length} color="green" />
          <StatCard icon={<Clock />} label="Pending Requests" value={pendingRequests.length + pendingAppointments.length} color="orange" />
          <StatCard icon={<TrendingUp />} label="Active Cases" value={patients.length} color="purple" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('patients')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'patients'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              My Patients ({patients.length})
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'appointments'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('pendingAppointments')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all relative ${
                activeTab === 'pendingAppointments'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending Appointments ({pendingAppointments.length})
              {pendingAppointments.length > 0 && activeTab !== 'pendingAppointments' && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all relative ${
                activeTab === 'requests'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending Requests ({pendingRequests.length})
              {pendingRequests.length > 0 && activeTab !== 'requests' && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'patients' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search patients..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Patients ({filteredPatients.length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => loadPatientDetails(patient.id)}
                      className={`w-full p-5 text-left hover:bg-gray-50 transition-all ${
                        selectedPatient === patient.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                            {patient.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{patient.full_name}</div>
                            <div className="text-sm text-gray-600">{patient.gender} • {patient.blood_group}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {!selectedPatient ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Select a Patient</h3>
                  <p className="text-gray-500">Choose a patient from the list to view their details</p>
                </div>
              ) : patientDetails ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                          {patientDetails.patient.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800">{patientDetails.patient.full_name}</h2>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                            <p>Age: {Math.floor((new Date() - new Date(patientDetails.patient.date_of_birth)) / 31557600000)} years</p>
                            <p>Gender: {patientDetails.patient.gender}</p>
                            <p>Blood Group: {patientDetails.patient.blood_group}</p>
                            <p>Phone: {patientDetails.patient.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={handleAnalyzePatient} 
                          disabled={chatLoading}
                          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>AI Analysis</span>
                        </button>
                        <button
                          onClick={() => {
                            const assignment = patients.find(p => p.patient.id === selectedPatient);
                            if (assignment) handleRemovePatient(assignment.assignment_id);
                          }}
                          disabled={removingPatient}
                          className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
                          title="Remove Patient"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex border-b border-gray-200 p-2">
                      {['overview', 'metrics', 'records', 'healthFiles'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDetailsTab(tab)}
                          className={`flex-1 px-6 py-3 rounded-xl font-medium capitalize transition-all ${
                            detailsTab === tab
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {tab === 'healthFiles' ? 'Health Data' : tab}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {detailsTab === 'overview' && (
                        <div className="grid grid-cols-2 gap-4">
                          <InfoCard label="Email" value={patientDetails.patient.email} />
                          <InfoCard label="Phone" value={patientDetails.patient.phone} />
                          <InfoCard label="Blood Type" value={patientDetails.patient.blood_group} />
                          <InfoCard label="Gender" value={patientDetails.patient.gender} />
                        </div>
                      )}

                      {detailsTab === 'metrics' && (
                        <AutoMetricsDashboard 
                          isDoctor={true}
                          patientId={selectedPatient}
                        />
                      )}

                      {detailsTab === 'records' && (
                        <div className="space-y-4">
                          {patientDetails.records && patientDetails.records.length > 0 ? (
                            patientDetails.records.map((record) => (
                              <div key={record.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold text-gray-800">{record.record_type}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(record.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">No medical records available</p>
                            </div>
                          )}
                        </div>
                      )}

                      {detailsTab === 'healthFiles' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">
                              Health Data Files ({patientDetails.healthFiles?.length || 0})
                            </h3>
                          </div>
                          {patientDetails.healthFiles && patientDetails.healthFiles.length > 0 ? (
                            patientDetails.healthFiles.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-5 border border-gray-200 rounded-xl hover:shadow-md transition-all bg-gradient-to-r from-blue-50 to-purple-50">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-800">{file.filename}</p>
                                    <p className="text-sm text-gray-600">
                                      {file.total_records} metrics generated • {new Date(file.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    file.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {file.processed ? '✓ Processed' : '⏳ Processing'}
                                  </span>
                                  {(file.file_type === 'txt' || file.file_type === 'csv' || file.file_type === 'json') && (
                                    <button
                                      onClick={() => handleViewFile(file.id)}
                                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                      title="View file content"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDownloadFile(file.id, file.filename)}
                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                                    title="Download file"
                                  >
                                    <Download className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">No health data files uploaded</p>
                              <p className="text-sm text-gray-400 mt-1">Patient hasn't uploaded any fitness tracker data yet</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading patient details...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Schedule Appointment</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {appointment.patient?.full_name?.charAt(0).toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-lg">{appointment.patient?.full_name || 'Unknown Patient'}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(appointment.appointment_datetime || appointment.appointment_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                            <span className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(appointment.appointment_datetime || appointment.appointment_date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          {appointment.reason && (
                            <p className="text-sm text-gray-500 mt-2 italic">{appointment.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getAppointmentStatusBadge(appointment.status)}
                        {(appointment.status === 'scheduled' || appointment.status === 'approved' || appointment.status === 'pending') && (
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            disabled={cancellingAppointment}
                            className="flex items-center space-x-2 px-5 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium border border-red-200 hover:border-red-300 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No appointments scheduled</p>
                    <p className="text-gray-400 text-sm mt-2">Schedule appointments with your patients</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Pending Patient Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending requests</p>
                <p className="text-gray-400 text-sm mt-2">New patient requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {request.patient.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">{request.patient.full_name}</h3>
                            <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                              <span>{request.patient.gender}</span>
                              <span>•</span>
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                {request.patient.blood_group}
                              </span>
                              <span>•</span>
                              <span>{request.patient.email}</span>
                            </div>
                          </div>
                        </div>
                        
                        {request.message && (
                          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-700">{request.message}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Requested: {new Date(request.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={requestsLoading}
                          className="flex items-center space-x-2 bg-green-500 text-white px-5 py-3 rounded-xl hover:bg-green-600 hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Accept</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={requestsLoading}
                          className="flex items-center space-x-2 bg-red-500 text-white px-5 py-3 rounded-xl hover:bg-red-600 hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="font-medium">Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pendingAppointments' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center space-x-2">
              <Clock className="w-6 h-6" />
              <span>Pending Appointment Requests</span>
            </h2>
            
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending appointment requests</p>
                <p className="text-gray-400 text-sm mt-2">Patient appointment requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-orange-200 bg-orange-50 rounded-xl p-6 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {appointment.patient?.full_name?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              {appointment.patient?.full_name || 'Unknown Patient'}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(appointment.appointment_datetime || appointment.appointment_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                              <span>•</span>
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(appointment.appointment_datetime || appointment.appointment_date).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {appointment.reason && (
                          <div className="bg-white border border-orange-200 p-4 rounded-lg mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Reason for visit:</p>
                            <p className="text-sm text-gray-600">{appointment.reason}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Requested: {new Date(appointment.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleApproveAppointment(appointment.id)}
                          disabled={approvingAppointment}
                          className="flex items-center space-x-2 bg-green-500 text-white px-5 py-3 rounded-xl hover:bg-green-600 hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectAppointment(appointment.id)}
                          disabled={approvingAppointment}
                          className="flex items-center space-x-2 bg-red-500 text-white px-5 py-3 rounded-xl hover:bg-red-600 hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="font-medium">Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">Schedule Appointment</h3>
              <button 
                onClick={() => setShowAppointmentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Patient *
                </label>
                <select
                  value={appointmentForm.patient_id}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a patient</option>
                  {patients.map((item) => (
                    <option key={item.patient.id} value={item.patient.id}>
                      {item.patient.full_name} - {item.patient.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={appointmentForm.appointment_date}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={appointmentForm.appointment_time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason / Notes
                </label>
                <textarea
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Purpose of visit, symptoms, etc."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleBookAppointment}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  Schedule Appointment
                </button>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && fileContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">File Content</h3>
              <button 
                onClick={closeFileViewer}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingFile ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading file content...</p>
                </div>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-xl text-sm overflow-x-auto border border-gray-200">
                  {fileContent.content}
                </pre>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={closeFileViewer}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && selectedPatient && (
        <div className="fixed bottom-28 right-8 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex justify-between items-center">
            <h3 className="font-bold text-lg">AI Health Assistant</h3>
            <button onClick={() => setShowChat(false)} className="text-white hover:text-gray-200 text-2xl">&times;</button>
          </div>
          <div className="h-96 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.message_type === 'user' || msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-4 rounded-2xl shadow-sm ${
                  msg.message_type === 'user' || msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Ask about this patient's health data</p>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-gray-200 flex space-x-3 bg-white">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about patient..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              disabled={chatLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {selectedPatient && !showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 rounded-2xl shadow-2xl hover:shadow-3xl transition-all z-40"
          title="Chat with AI about this patient"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onDeleteAccount={handleDeleteAccount}  // ADD THIS LINE
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500',
    purple: 'from-purple-500 to-pink-500'
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
    </div>
  );
}