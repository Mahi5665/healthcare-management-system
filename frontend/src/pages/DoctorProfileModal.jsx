import { X, User, Mail, Phone, MapPin, Calendar, Clock, Award, Star, Briefcase } from 'lucide-react';

export default function DoctorProfileModal({ doctor, isOpen, onClose, onBookAppointment }) {
  if (!isOpen || !doctor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {doctor.full_name?.split(' ').map(n => n[0]).join('') || 'D'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">Dr. {doctor.full_name}</h2>
                <p className="text-blue-100 text-sm mt-1">{doctor.specialization || 'General Practice'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Contact Information
            </h3>
            <div className="space-y-2">
              {doctor.email && (
                <div className="flex items-center text-sm text-gray-700">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{doctor.email}</span>
                </div>
              )}
              {doctor.phone && (
                <div className="flex items-center text-sm text-gray-700">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{doctor.phone}</span>
                </div>
              )}
              {doctor.location && (
                <div className="flex items-center text-sm text-gray-700">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{doctor.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Professional Details */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
              Professional Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {doctor.years_of_experience && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Experience</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {doctor.years_of_experience} years
                  </p>
                </div>
              )}
              {doctor.license_number && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">License Number</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {doctor.license_number}
                  </p>
                </div>
              )}
            </div>
            {doctor.qualifications && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Qualifications</p>
                <p className="text-sm text-gray-700">{doctor.qualifications}</p>
              </div>
            )}
          </div>

          {/* Bio/About */}
          {doctor.bio && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Award className="w-5 h-5 mr-2 text-blue-600" />
                About
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{doctor.bio}</p>
            </div>
          )}

          {/* Availability */}
          {doctor.availability && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Availability
              </h3>
              <p className="text-sm text-gray-700">{doctor.availability}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {doctor.patient_count || 0}
              </div>
              <div className="text-xs text-gray-600 mt-1">Patients</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {doctor.appointment_count || 0}
              </div>
              <div className="text-xs text-gray-600 mt-1">Appointments</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => onBookAppointment(doctor.id)}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-medium"
            >
              <Calendar className="w-5 h-5" />
              <span>Book Appointment</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}