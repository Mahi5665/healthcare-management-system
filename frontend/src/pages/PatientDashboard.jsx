import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Activity, Thermometer, Droplet, Moon, Upload, MessageCircle, Calendar, FileText, LogOut, Search, Users, CheckCircle, Clock, XCircle, User, TrendingUp, Bell, Settings, Plus, Download, Trash2, X, AlertCircle, Mail, Phone } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import SettingsModal from './SettingsModal';
import AutoMetricsDashboard from './AutoMetricsDashboard';
import DoctorProfileModal from './DoctorProfileModal';
import { useNavigate } from 'react-router-dom';
import { patientAPI, chatAPI, authAPI } from '../services/api';

export default function EnhancedPatientDashboard() {
  const { user, profile, logout } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: ''
  });
  
  // Real data state
  const [dashboardData, setDashboardData] = useState(null);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [healthFiles, setHealthFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [removingDoctor, setRemovingDoctor] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [cancellingAppointment, setCancellingAppointment] = useState(false);
  const [showDoctorProfile, setShowDoctorProfile] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorSearchModal, setShowDoctorSearchModal] = useState(false);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');             
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);             
  const [searchingDoctors, setSearchingDoctors] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('token');
    
    if (token && user) {
      loadDashboard().then(() => {
        if (!mounted) return;
      });
    } else {
      setLoading(false);
    }
    
    return () => { mounted = false; };
  }, [user]);

  const loadDashboard = async () => {
    try {
      // Load all dashboard data
      const [dashboardRes, metricsRes, chatRes, doctorsRes, filesRes, requestsRes, appointmentsRes, notificationsRes] = await Promise.all([
        patientAPI.getDashboardSummary(),
        patientAPI.getHealthMetrics(),
        chatAPI.getChatHistory(),
        patientAPI.getAssignedDoctors(),
        patientAPI.getHealthDataFiles(),
        patientAPI.getMyDoctorRequests(),
        patientAPI.getAppointments(),
        patientAPI.getNotifications()
      ].map(p => p.catch(err => {
        console.error('API call failed:', err);
        return { data: {} };
      })));
      
      setDashboardData(dashboardRes.data || {});
      setMetrics(metricsRes.data?.metrics || []);
      setChatMessages(chatRes.data?.messages || []);
      setDoctors(doctorsRes.data?.doctors || []);
      setHealthFiles(filesRes.data?.files || []);
      setMyRequests(requestsRes.data?.requests || []);
      setAppointments(appointmentsRes.data?.appointments || []);
      setNotifications(notificationsRes.data?.notifications || []);

      // Check if there are unread notifications
      const hasUnread = (notificationsRes.data.notifications || []).length > 0 ||
                        (requestsRes.data.requests || []).filter(r => r.status === 'pending').length > 0 ||
                        (filesRes.data.files || []).length > 0;
      setHasUnreadNotifications(hasUnread);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        logout();
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateProfile = async (updatedData) => {
  try {
    const response = await patientAPI.updateProfile(updatedData);
    // Reload the entire dashboard to get fresh data
    await loadDashboard();
    // Force a page reload to refresh the auth context
    window.location.reload();
    return response.data;
  } catch (error) {
    console.error('Profile update error:', error);
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

  const handleSearchDoctors = async () => {
  if (!doctorSearchQuery.trim()) return;  
  
  setSearchingDoctors(true); 
  try {
    const response = await patientAPI.searchDoctors(doctorSearchQuery, null);  
    setSearchResults(response.data.doctors || []);
  } catch (error) {
    console.error('Failed to search doctors:', error);
    alert('Failed to search doctors: ' + (error.response?.data?.error || error.message));
  } finally {
    setSearchingDoctors(false);
  }
};

  const handleViewDoctorProfile = (doctor) => {
  setSelectedDoctor(doctor);
  setShowDoctorProfile(true);
};

const handleBookAppointmentFromProfile = (doctorId) => {
  // Set the doctor in appointment form and open modal
  setAppointmentForm({
    ...appointmentForm,
    doctor_id: doctorId
  });
  setShowAppointmentModal(true);
  setShowDoctorProfile(false);
};

  const handleSendDoctorRequest = async (doctorId) => {
    try {
      await patientAPI.sendDoctorRequest({
        doctor_id: doctorId,
        message: 'I would like to be your patient'
      });
      alert('Request sent successfully!');
      loadDashboard();
    } catch (error) {
      console.error('Failed to send request:', error);
      alert(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleRemoveDoctor = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this doctor?')) return;

    setRemovingDoctor(true);
    try {
      await patientAPI.removeDoctorAssignment(assignmentId);
      alert('Doctor removed successfully');
      loadDashboard();
    } catch (error) {
      console.error('Failed to remove doctor:', error);
      alert(error.response?.data?.error || 'Failed to remove doctor');
    } finally {
      setRemovingDoctor(false);
    }
  };

  // File handling functions - ADD THESE AFTER handleCancelAppointment
  const handleViewFile = async (fileId) => {
    try {
      const response = await patientAPI.viewHealthDataFile(fileId);
      const content = response.data.content;
      const fileType = response.data.file_type;
      
      if (content.length > 1000) {
        alert(`${response.data.filename} (${fileType})\n\nShowing first 1000 characters:\n\n${content.substring(0, 1000)}...`);
      } else {
        alert(`${response.data.filename} (${fileType})\n\n${content}`);
      }
    } catch (error) {
      console.error('Failed to view file:', error);
      alert('Failed to view file: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDownloadFile = async (fileId, filename) => {
    try {
      const response = await patientAPI.downloadHealthDataFile(fileId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log('File downloaded:', filename);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }
    
    try {
      await patientAPI.deleteHealthDataFile(fileId);
      alert('File deleted successfully!');
      loadDashboard();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    setCancellingAppointment(true);
    try {
      await patientAPI.cancelAppointment(appointmentId);
      alert('Appointment cancelled successfully');
      loadDashboard();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      alert(error.response?.data?.error || 'Failed to cancel appointment');
    } finally {
      setCancellingAppointment(false);
    }
  };

  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log('📤 Starting file upload:', file.name, 'Size:', file.size, 'Type:', file.type);
  setUploadingFile(true);
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('🔄 Sending to API...');
    const response = await patientAPI.uploadHealthData(formData);
    console.log('✅ Upload response:', response.data);
    
    alert(`Health data uploaded successfully! 
Generated ${response.data.records_added} metrics from your file.`);
    
    // Reload dashboard to show new file
    console.log('🔄 Reloading dashboard...');
    await loadDashboard();
    
    // Switch to upload tab to see the new file
    setActiveTab('upload');
    console.log('✅ Upload complete, switched to upload tab');
  } catch (error) {
    console.error('❌ Failed to upload file:', error);
    console.error('Error details:', error.response?.data);
    alert('Failed to upload file: ' + (error.response?.data?.error || error.message));
  } finally {
    setUploadingFile(false);
    // Reset file input so same file can be uploaded again
    e.target.value = '';
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

  const handleBookAppointment = async () => {
    if (!appointmentForm.doctor_id || !appointmentForm.appointment_date || !appointmentForm.appointment_time) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await patientAPI.bookAppointment({
        ...appointmentForm,
        appointment_datetime: `${appointmentForm.appointment_date} ${appointmentForm.appointment_time}`
      });
      alert('Appointment booked successfully!');
      setShowAppointmentModal(false);
      setAppointmentForm({
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: ''
      });
      loadDashboard();
    } catch (error) {
      console.error('Failed to book appointment:', error);
      alert(error.response?.data?.error || 'Failed to book appointment');
    }
  };

  const getMetricIcon = (type) => {
    const icons = {
      heartbeat: Heart,
      blood_pressure: Activity,
      temperature: Thermometer,
      blood_oxygen: Droplet,
      sugar_level: Droplet,
      sleep_hours: Moon,
      steps: Activity,
      calories: Droplet
    };
    return icons[type] || Activity;
  };

  const getMetricColor = (type) => {
    const colors = {
      heartbeat: 'from-red-500 to-pink-500',
      blood_pressure: 'from-blue-500 to-cyan-500',
      temperature: 'from-orange-500 to-red-500',
      blood_oxygen: 'from-purple-500 to-pink-500',
      sugar_level: 'from-purple-500 to-indigo-500',
      sleep_hours: 'from-indigo-500 to-blue-500',
      steps: 'from-green-500 to-emerald-500',
      calories: 'from-yellow-500 to-orange-500'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getRequestStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      accepted: { icon: CheckCircle, color: 'bg-green-100 text-green-800', text: 'Accepted' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', text: 'Rejected' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getAppointmentStatusBadge = (status) => {
  const badges = {
    pending: { color: 'bg-orange-100 text-orange-800', text: 'Pending Approval', icon: Clock },
    approved: { color: 'bg-green-100 text-green-800', text: 'Approved', icon: CheckCircle },
    scheduled: { color: 'bg-blue-100 text-blue-800', text: 'Scheduled', icon: CheckCircle },
    completed: { color: 'bg-green-100 text-green-800', text: 'Completed', icon: CheckCircle },
    cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled', icon: XCircle },
    rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected', icon: XCircle },
  };
  const badge = badges[status] || badges.pending;
  const Icon = badge.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {badge.text}
    </span>
  );
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Health Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {profile?.full_name || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Profile Info */}
              <div className="hidden md:flex items-center space-x-3 mr-4 px-4 py-2 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow">
                  {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500">{profile?.email || ''}</p>
                </div>
              </div>

              {/* Notifications Button */}
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    // Mark as read when opening
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

              {/* Settings Button */}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-3 hover:bg-purple-50 rounded-xl transition group"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition" />
              </button>

              {/* Logout Button */}
              <button 
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="fixed top-20 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Uploaded Files Notification */}
            {healthFiles.length > 0 && (
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {healthFiles.length} Health Data File{healthFiles.length > 1 ? 's' : ''} Uploaded
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {healthFiles[0]?.total_records || 0} metrics generated
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('upload');
                        setShowNotifications(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                    >
                      View Files →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Doctor Requests */}
            {myRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {myRequests.filter(r => r.status === 'pending').length} Pending Doctor Request{myRequests.filter(r => r.status === 'pending').length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Waiting for doctor approval
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('requests');
                        setShowNotifications(false);
                      }}
                      className="text-xs text-yellow-600 hover:text-yellow-800 font-medium mt-2"
                    >
                      View Requests →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Appointments */}
            {appointments.filter(a => a.status === 'approved' || a.status === 'scheduled').length > 0 && (
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {appointments.filter(a => a.status === 'approved' || a.status === 'scheduled').length} Upcoming Appointment{appointments.filter(a => a.status === 'approved' || a.status === 'scheduled').length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      You have confirmed appointments
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('appointments');
                        setShowNotifications(false);
                      }}
                      className="text-xs text-green-600 hover:text-green-800 font-medium mt-2"
                    >
                      View Appointments →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Accepted Requests */}
            {myRequests.filter(r => r.status === 'accepted').length > 0 && (
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {myRequests.filter(r => r.status === 'accepted').length} Request{myRequests.filter(r => r.status === 'accepted').length > 1 ? 's' : ''} Accepted
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Doctor{myRequests.filter(r => r.status === 'accepted').length > 1 ? 's' : ''} accepted your request
                    </p>
                    <button 
                      onClick={() => {
                        setActiveTab('doctors');
                        setShowNotifications(false);
                      }}
                      className="text-xs text-green-600 hover:text-green-800 font-medium mt-2"
                    >
                      View Doctors →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Notifications from Backend */}
            {notifications.map((notif, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{notif.message}</p>
                    {notif.date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {healthFiles.length === 0 && 
            myRequests.filter(r => r.status === 'pending').length === 0 && 
            appointments.filter(a => a.status === 'approved' || a.status === 'scheduled').length === 0 &&
            myRequests.filter(r => r.status === 'accepted').length === 0 &&
            notifications.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content*/}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
              <div className="flex space-x-2 overflow-x-auto">
                {['overview', 'metrics', 'doctors', 'appointments', 'requests', 'upload'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-xl font-medium capitalize whitespace-nowrap transition-all ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
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
                {/* Current Vital Signs - Latest Values Only */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Current Health Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardData?.latest_metrics && Object.entries(dashboardData.latest_metrics).map(([key, metric]) => {
                      const Icon = getMetricIcon(key);
                      return (
                        <div key={key} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${getMetricColor(key)}`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-gray-600 capitalize font-medium mb-1">{key.replace('_', ' ')}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {metric.value} <span className="text-xs text-gray-500 font-normal">{metric.unit}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(metric.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: FileText, label: 'Medical Records', value: dashboardData?.record_count || 0, color: 'blue' },
                    { icon: Users, label: 'Care Team', value: dashboardData?.doctor_count || 0, color: 'green' },
                    { icon: Calendar, label: 'Appointments', value: appointments.length, color: 'purple' },
                    { 
                      icon: Upload, 
                      label: 'Health Files', 
                      value: healthFiles.length, 
                      color: 'orange', 
                      sublabel: `${healthFiles.reduce((sum, file) => sum + (file.total_records || 0), 0)} metrics from ring`
                    }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all">
                      <stat.icon className={`w-8 h-8 text-${stat.color}-500 mb-3`} />
                      <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                      <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                      {stat.sublabel && (
                        <p className="text-xs text-gray-500 mt-1">{stat.sublabel}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <AutoMetricsDashboard 
                patientAPI={patientAPI}
                isDoctor={false}
                patientId={null}
              />
            )}

            {/* Doctors Tab */}
            {activeTab === 'doctors' && (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-bold text-gray-800">My Doctors</h2>
      <button
        onClick={() => setShowDoctorSearchModal(true)}  // ← CHANGE TO THIS
        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-3 rounded-xl hover:shadow-lg transition-all"
      >
        <Plus className="w-5 h-5" />
        <span>Add Doctor</span>
      </button>
          </div>
    {doctors.length === 0 ? (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No doctors assigned yet</p>
        <p className="text-gray-400 text-sm mt-2">Search and send requests to doctors</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHANGED: assignedDoctors.map → doctors.map */}
        {doctors.map((assignment) => (
          <div 
            key={assignment.id} 
            className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {assignment.doctor.full_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Dr. {assignment.doctor.full_name}
                  </h3>
                  <p className="text-sm text-blue-600 font-medium">
                    {assignment.doctor.specialization}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {assignment.doctor.email}
              </div>
              {assignment.doctor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {assignment.doctor.phone}
                </div>
              )}
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}
              </div>
            </div>

            <div className="flex space-x-2">
              {/* ✅ View Profile Button */}
              <button
                onClick={() => handleViewDoctorProfile(assignment.doctor)}
                className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
              >
                <User className="w-4 h-4" />
                <span>View Profile</span>
              </button>
              
              <button
                onClick={() => {
                  setAppointmentForm({...appointmentForm, doctor_id: assignment.doctor.id});
                  setShowAppointmentModal(true);
                }}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition font-medium border border-green-200"
              >
                <Calendar className="w-4 h-4" />
                <span>Book</span>
              </button>
              
              <button
                onClick={() => handleRemoveDoctor(assignment.id)}
                disabled={removingDoctor}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                title="Remove Doctor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

{activeTab === 'appointments' && (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-800">My Appointments</h2>
      <button
        onClick={() => setShowAppointmentModal(true)}
        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
      >
        <Plus className="w-5 h-5" />
        <span>Book Appointment</span>
      </button>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div 
            key={appointment.id} 
            className={`p-6 rounded-xl transition-all border-2 ${
              appointment.status === 'pending' ? 'border-orange-200 bg-orange-50' :
              appointment.status === 'approved' ? 'border-green-200 bg-green-50' :
              appointment.status === 'rejected' ? 'border-red-200 bg-red-50' :
              'border-gray-200 bg-white'
            } hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                  {appointment.doctor?.full_name?.charAt(0) || 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">Dr. {appointment.doctor?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{appointment.doctor?.specialization || 'General'}</p>
                    </div>
                    {getAppointmentStatusBadge(appointment.status)}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3 mb-3">
                    <span className="flex items-center text-sm text-gray-700 font-medium">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      {new Date(appointment.appointment_datetime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center text-sm text-gray-700 font-medium">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      {new Date(appointment.appointment_datetime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  
                  {appointment.reason && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">Reason for Visit</p>
                      <p className="text-sm text-gray-700">{appointment.reason}</p>
                    </div>
                  )}

                  {/* Status-specific messages */}
                  {appointment.status === 'pending' && (
                    <div className="flex items-start space-x-2 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Waiting for Doctor Approval</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Your appointment request has been sent. The doctor will review and respond soon.
                        </p>
                      </div>
                    </div>
                  )}

                  {appointment.status === 'approved' && (
                    <div className="flex items-start space-x-2 p-3 bg-green-100 border border-green-300 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-900">Appointment Confirmed</p>
                        <p className="text-xs text-green-700 mt-1">
                          Your appointment has been approved by the doctor. Please arrive 10 minutes early.
                        </p>
                      </div>
                    </div>
                  )}

                  {appointment.status === 'rejected' && (
                    <div className="flex items-start space-x-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">Appointment Declined</p>
                        {appointment.notes ? (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-red-800 mb-1">Doctor's Note:</p>
                            <p className="text-xs text-red-700 italic bg-white p-2 rounded border border-red-200">
                              "{appointment.notes}"
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-red-700 mt-1">
                            Your appointment request was declined. Please try booking another time or contact the doctor's office.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Requested on {new Date(appointment.created_at || appointment.appointment_datetime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    {(appointment.status === 'pending' || appointment.status === 'approved') && (
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        disabled={cancellingAppointment}
                        className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Cancel Appointment</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {appointments.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No appointments scheduled</p>
            <p className="text-gray-400 text-sm mt-2 mb-6">Book an appointment with your doctor to get started</p>
            <button
              onClick={() => setShowAppointmentModal(true)}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Book Your First Appointment</span>
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
)}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold mb-6 text-gray-800">My Doctor Requests ({myRequests.length})</h2>
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <div key={request.id} className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-800">Dr. {request.doctor?.full_name}</p>
                          <p className="text-sm text-gray-600">{request.doctor?.specialization}</p>
                        </div>
                        {getRequestStatusBadge(request.status)}
                      </div>
                      {request.message && (
                        <p className="text-sm text-gray-600 mb-2">{request.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Sent: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {myRequests.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No requests sent yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                {/* Upload Section Headers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Health Data Upload Section */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">📊 Health Data</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Fitness tracker files
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-500" />
                    </div>
                    
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 transition bg-gradient-to-br from-blue-50 to-purple-50">
                      <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                      <label className="cursor-pointer">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg inline-block font-medium text-sm">
                          {uploadingFile ? 'Uploading...' : 'Choose File'}
                        </span>
                        <input
                          type="file"
                          accept=".csv,.json,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingFile}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-3">
                        CSV, JSON, TXT
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Auto-generates metrics
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Heart Rate</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Steps</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <Moon className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Sleep</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <Droplet className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Blood O2</p>
                      </div>
                    </div>
                  </div>

                  {/* Medical Records Upload Section */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">📄 Medical Records</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Reports, scans, prescriptions
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-green-500" />
                    </div>
                    
                    <div className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 transition bg-gradient-to-br from-green-50 to-emerald-50">
                      <FileText className="w-10 h-10 text-green-400 mx-auto mb-3" />
                      <label className="cursor-pointer">
                        <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg inline-block font-medium text-sm">
                          Choose Document
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            // TODO: Add medical record upload handler
                            alert('Medical records upload coming soon! Connect this to your existing medical record upload endpoint.');
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-3">
                        PDF, JPG, PNG
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Lab reports, X-rays, etc.
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Lab Reports</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">X-Rays</p>
                      </div>
                      <div className="text-center p-3 bg-pink-50 rounded-lg">
                        <FileText className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Prescriptions</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <FileText className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                        <p className="text-xs font-medium text-gray-700">Scans</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Health Data Files */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Health Data Files ({healthFiles.length})
                  </h3>
                  <div className="space-y-3">
                    {healthFiles.map((file) => (
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
                          <button
                            onClick={() => handleViewFile(file.id)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                            title="View File"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file.id, file.filename)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                            title="Delete File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {healthFiles.length === 0 && (
                      <div className="text-center py-12">
                        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No health data files uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Upload fitness tracker data to auto-generate metrics</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medical Records List - TODO: Add backend support */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-500" />
                    Medical Documents (Connect to Backend)
                  </h3>
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Connect to your existing medical records endpoint</p>
                    <p className="text-sm text-gray-400 mt-1">You already have /medical-records endpoints in your backend!</p>
                  </div>
                </div>
              </div>
            )}
            </div>

          {/* Sidebar - Takes 1 column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-3">
                  {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{profile?.full_name || 'User'}</h3>
                <p className="text-sm text-gray-600">{profile?.email || ''}</p>
              </div>
              <div className="space-y-3">
                {profile?.gender && <InfoRow label="Gender" value={profile.gender} />}
                {profile?.blood_type && <InfoRow label="Blood Type" value={profile.blood_type} />}
                {profile?.height_cm && <InfoRow label="Height" value={`${profile.height_cm} cm`} />}
                {profile?.weight_kg && <InfoRow label="Weight" value={`${profile.weight_kg} kg`} />}
                {profile?.date_of_birth && (
                  <InfoRow label="DOB" value={new Date(profile.date_of_birth).toLocaleDateString()} />
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Quick Actions</h3>
              <div className="space-y-2">
                <ActionButton icon={<Calendar />} label="Book Appointment" onClick={() => setShowAppointmentModal(true)} />
                <ActionButton icon={<Upload />} label="Upload Data" onClick={() => setActiveTab('upload')} />
                <ActionButton 
                  icon={<FileText />} 
                  label="View Records" 
                  onClick={() => setActiveTab('upload')} 
                />
                <ActionButton 
                  icon={<Download />} 
                  label="Export Data" 
                  onClick={() => {
                    // Create CSV export of health metrics
                    const csvContent = [
                      ['Type', 'Value', 'Unit', 'Date'].join(','),
                      ...metrics.map(m => [
                        m.metric_type,
                        m.value,
                        m.unit || '',
                        new Date(m.recorded_at).toLocaleString()
                      ].join(','))
                    ].join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `health_metrics_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
       </div>
        
      {/* Doctor Profile Modal */}
      {showDoctorProfile && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          isOpen={showDoctorProfile}
          onClose={() => setShowDoctorProfile(false)}
          onBookAppointment={handleBookAppointmentFromProfile}
        />
      )}

      {/* ADD THIS ENTIRE DOCTOR SEARCH MODAL BELOW */}
      {showDoctorSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Search Doctors</h2>
              <button onClick={() => {
                setShowDoctorSearchModal(false);
                setSearchResults([]);
                setDoctorSearchQuery('');
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="flex space-x-3 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={doctorSearchQuery}
                  onChange={(e) => setDoctorSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchDoctors()}
                  placeholder="Search by name or specialization..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSearchDoctors}
                disabled={searchingDoctors || !doctorSearchQuery.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searchingDoctors ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            <div className="space-y-4">
              {searchResults.length === 0 && !searchingDoctors && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Search for doctors to connect with</p>
                  <p className="text-gray-400 text-sm mt-2">Enter a name or specialization above</p>
                </div>
              )}

              {searchingDoctors && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Searching doctors...</p>
                </div>
              )}

              {searchResults.map((doctor) => {
                const isAssigned = doctors.some(d => d.doctor.id === doctor.id);
                const requestSent = myRequests.some(r => 
                  r.doctor_id === doctor.id && r.status === 'pending'
                );

                return (
                  <div 
                    key={doctor.id} 
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {doctor.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800">
                            Dr. {doctor.full_name}
                          </h3>
                          <p className="text-sm text-blue-600 font-medium mb-2">
                            {doctor.specialization}
                          </p>
                          <div className="space-y-1">
                            {doctor.email && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Mail className="w-3 h-3 mr-2" />
                                {doctor.email}
                              </div>
                            )}
                            {doctor.phone && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Phone className="w-3 h-3 mr-2" />
                                {doctor.phone}
                              </div>
                            )}
                            {doctor.hospital && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Users className="w-3 h-3 mr-2" />
                                {doctor.hospital}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {isAssigned ? (
                          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                            Already Assigned
                          </span>
                        ) : requestSent ? (
                          <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Request Pending
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleViewDoctorProfile(doctor)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => handleSendDoctorRequest(doctor.id)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition text-sm font-medium"
                            >
                              Send Request
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Book Appointment</h2>
              <button onClick={() => setShowAppointmentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Select Doctor</label>
                <select
                  value={appointmentForm.doctor_id}
                  onChange={(e) => setAppointmentForm({...appointmentForm, doctor_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a doctor</option>
                  {doctors.map((item) => (
                    <option key={item.doctor.id} value={item.doctor.id}>
                      Dr. {item.doctor.full_name} - {item.doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                <input
                  type="date"
                  value={appointmentForm.appointment_date}
                  onChange={(e) => setAppointmentForm({...appointmentForm, appointment_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Time</label>
                <input
                  type="time"
                  value={appointmentForm.appointment_time}
                  onChange={(e) => setAppointmentForm({...appointmentForm, appointment_time: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Reason (Optional)</label>
                <textarea
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({...appointmentForm, reason: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Describe the reason for your appointment"
                />
              </div>
              <button
                onClick={handleBookAppointment}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-medium"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 rounded-2xl shadow-2xl hover:shadow-3xl transition-all"
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed bottom-28 right-8 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex justify-between items-center">
            <h3 className="font-bold text-lg">AI Health Assistant</h3>
            <button onClick={() => setShowChat(false)} className="text-white hover:text-gray-200 text-2xl">&times;</button>
          </div>
          <div className="h-96 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-4 rounded-2xl shadow-sm ${
                  msg.message_type === 'user' 
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
                <p>Start a conversation with your AI health assistant</p>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-gray-200 flex space-x-3 bg-white">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              disabled={chatLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
            >
              {chatLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
      
      {/* Doctor Profile Modal */}
      {showDoctorProfile && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          isOpen={showDoctorProfile}
          onClose={() => setShowDoctorProfile(false)}
          onBookAppointmentFromProfile={handleBookAppointmentFromProfile}
        />
      )}
    </div>
  );
} 

// These helper functions should be OUTSIDE the main component
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-200"
    >
      <div className="text-blue-600">{icon}</div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}