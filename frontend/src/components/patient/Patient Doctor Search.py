import { useState, useEffect } from 'react';
import { Search, Send, CheckCircle, Clock, XCircle, User, Loader2 } from 'lucide-react';
import { patientAPI } from '../services/api';

export default function DoctorSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Load requests on component mount
  useEffect(() => {
    loadMyRequests();
  }, []);

  const searchDoctors = async () => {
    if (!searchQuery.trim() && !specialization.trim()) {
      setError('Please enter a search term or select a specialization');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await patientAPI.searchDoctors(searchQuery, specialization);
      
      if (response.data && response.data.doctors) {
        setDoctors(response.data.doctors);
        if (response.data.doctors.length === 0) {
          setError('No doctors found matching your search criteria');
        }
      } else {
        setDoctors([]);
        setError('No doctors found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError(error.response?.data?.error || 'Failed to search doctors. Please try again.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await patientAPI.getMyDoctorRequests();
      if (response.data && response.data.requests) {
        setMyRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const sendRequest = async (doctorId) => {
    setSending(true);
    setError(null);
    try {
      const response = await patientAPI.sendDoctorRequest({
        doctor_id: doctorId,
        message: message.trim() || 'I would like to request you as my doctor.'
      });

      if (response.data) {
        setShowRequestForm(null);
        setMessage('');
        await loadMyRequests();
        alert('Request sent successfully!');
      }
    } catch (error) {
      console.error('Failed to send request:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send request. Please try again.';
      alert(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const getRequestStatus = (doctorId) => {
    return myRequests.find(r => r.doctor?.id === doctorId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchDoctors();
    }
  };

  // Common specializations for quick filter
  const commonSpecializations = [
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'General Medicine'
  ];

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Find a Doctor</h3>
        
        {/* Search Inputs */}
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search by doctor name..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={searchDoctors}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          {/* Specialization Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Specialization
            </label>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Specializations</option>
              {commonSpecializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {doctors.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center justify-between">
              <span>Search Results ({doctors.length})</span>
              <button
                onClick={() => setDoctors([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </h4>
            <div className="space-y-3">
              {doctors.map((doctor) => {
                const request = getRequestStatus(doctor.id);
                
                return (
                  <div key={doctor.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {doctor.full_name ? doctor.full_name.charAt(0) : 'D'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">Dr. {doctor.full_name}</h4>
                          <p className="text-sm text-gray-600">{doctor.specialization || 'General Medicine'}</p>
                          {doctor.phone && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <span className="mr-2">📞</span> {doctor.phone}
                            </p>
                          )}
                          {doctor.email && (
                            <p className="text-xs text-gray-500 flex items-center">
                              <span className="mr-2">✉️</span> {doctor.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Request Status or Button */}
                      {request ? (
                        <div className="flex items-center space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <Clock className="w-4 h-4 text-yellow-500" />
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                Pending
                              </span>
                            </>
                          )}
                          {request.status === 'accepted' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                Accepted
                              </span>
                            </>
                          )}
                          {request.status === 'rejected' && (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                Rejected
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowRequestForm(doctor.id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                        >
                          <Send className="w-4 h-4" />
                          <span>Request</span>
                        </button>
                      )}
                    </div>

                    {/* Request Form */}
                    {showRequestForm === doctor.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message (Optional)
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Introduce yourself or explain why you're requesting this doctor..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows="3"
                        />
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => sendRequest(doctor.id)}
                            disabled={sending}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {sending ? 'Sending...' : 'Send Request'}
                          </button>
                          <button
                            onClick={() => {
                              setShowRequestForm(null);
                              setMessage('');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* My Requests Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            My Requests ({myRequests.length})
          </h3>
          <button
            onClick={loadMyRequests}
            disabled={requestsLoading}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50"
          >
            {requestsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {myRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No requests sent yet</p>
            <p className="text-sm text-gray-400 mt-1">Search for doctors and send requests to build your care team</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                      {request.doctor?.full_name ? request.doctor.full_name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Dr. {request.doctor?.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {request.doctor?.specialization || 'General Medicine'}
                      </p>
                      {request.message && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{request.message}"</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Sent: {new Date(request.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}