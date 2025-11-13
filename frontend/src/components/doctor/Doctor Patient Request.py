import { useState, useEffect } from 'react';
import { UserPlus, Check, X, Clock } from 'lucide-react';

export default function PatientRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/doctor/patient-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    setProcessing(requestId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/doctor/patient-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRequests(requests.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessing(requestId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/doctor/patient-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRequests(requests.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center space-x-2">
        <UserPlus className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Patient Requests</h3>
        {requests.length > 0 && (
          <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full">
            {requests.length}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No pending requests</p>
        </div>
      ) : (
        <div className="divide-y">
          {requests.map((request) => (
            <div key={request.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">
                      {request.patient.full_name}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {request.patient.gender} • {request.patient.blood_group}
                    </span>
                  </div>
                  
                  {request.message && (
                    <p className="text-sm text-gray-600 mt-1">
                      "{request.message}"
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    Requested {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleAccept(request.id)}
                    disabled={processing === request.id}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Accept</span>
                  </button>
                  
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processing === request.id}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-sm">Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}