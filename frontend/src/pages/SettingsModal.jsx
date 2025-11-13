import { useState, useEffect } from 'react';
import { X, User, Lock, Bell, Shield, Save, Edit2, AlertTriangle, Trash2 } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, profile, onUpdateProfile, onDeleteAccount }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [formData, setFormData] = useState({
  full_name: '',
  email: '',
  phone: '',
  gender: '',
  blood_type: '',
  height_cm: '',
  weight_kg: '',
  date_of_birth: '',
  specialization: '',
  license_number: '',
  location: '',
  years_of_experience: '',
  qualifications: '',
  bio: '',
  availability: ''
});
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [saving, setSaving] = useState(false);  // Keep only ONE of these
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteConfirmText, setDeleteConfirmText] = useState('');
const [deleting, setDeleting] = useState(false);
const [notifications, setNotifications] = useState({
  email: true,
  sms: true,
  appointments: true
});
 

  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        blood_type: profile.blood_type || profile.blood_group || '',
        height_cm: profile.height_cm || '',
        weight_kg: profile.weight_kg || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        specialization: profile.specialization || '',
        license_number: profile.license_number || '',
        location: profile.location || '',
        years_of_experience: profile.years_of_experience || '',
        qualifications: profile.qualifications || '',
        bio: profile.bio || '',
        availability: profile.availability || ''
      });
    }
  }, [profile, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await onUpdateProfile(formData);
      alert('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Profile update failed:', error);
      alert('Failed to update profile: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
  if (deleteConfirmText !== 'DELETE') {
    alert('Please type DELETE to confirm');
    return;
  }

  setDeleting(true);
  try {
    await onDeleteAccount();
    alert('Your account has been permanently deleted.');
    // The parent component will handle logout and redirect
  } catch (error) {
    console.error('Account deletion failed:', error);
    alert('Failed to delete account: ' + (error.response?.data?.error || error.message));
    setDeleting(false);
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  }
};

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }
    
    alert('Password change feature - API endpoint needed');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!isOpen) return null;

  const isDoctor = profile?.specialization !== undefined;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-800">Settings</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'profile'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Profile</span>
            </button>
            
            <button
              onClick={() => setActiveSection('password')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'password'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span className="font-medium">Password</span>
            </button>
            
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'notifications'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium">Notifications</span>
            </button>
            
            <button
              onClick={() => setActiveSection('privacy')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'privacy'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Privacy</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Profile Settings */}
            {activeSection === 'profile' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Profile Information</h3>
                    <p className="text-gray-600 mt-1">Update your personal details</p>
                  </div>
                  <Edit2 className="w-6 h-6 text-gray-400" />
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        autoComplete="name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        autoComplete="tel"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  {isDoctor && (
                    <div className="space-y-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-100">
                      <h4 className="text-lg font-bold text-gray-800">Professional Information</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                          <input
                            type="text"
                            name="specialization"
                            value={formData.specialization}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Cardiology"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                          <input
                            type="text"
                            name="license_number"
                            value={formData.license_number}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                          <input
                            type="number"
                            name="years_of_experience"
                            value={formData.years_of_experience}
                            onChange={handleInputChange}
                            min="0"
                            autoComplete="off"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                          <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Clinic/Hospital address"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
                        <input
                          type="text"
                          name="qualifications"
                          value={formData.qualifications}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., MBBS, MD, Board Certified"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                        <input
                          type="text"
                          name="availability"
                          value={formData.availability}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Mon-Fri 9AM-5PM"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bio/About</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows="4"
                          autoComplete="off"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Tell patients about yourself and your practice"
                        />
                      </div>
                    </div>
                  )}

                  {!isDoctor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          autoComplete="bday"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          autoComplete="sex"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
                        <select
                          name="blood_type"
                          value={formData.blood_type}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select blood type</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                        <input
                          type="number"
                          name="height_cm"
                          value={formData.height_cm}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="170"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                        <input
                          type="number"
                          name="weight_kg"
                          value={formData.weight_kg}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="70"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Password Settings */}
            {activeSection === 'password' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h3>
                <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <button
                      type="submit"
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition"
                    >
                      <Lock className="w-5 h-5" />
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Notification Preferences</h3>
                <div className="space-y-4 max-w-md">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('email')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        notifications.email ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          notifications.email ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via SMS</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('sms')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        notifications.sms ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          notifications.sms ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">Appointment Reminders</p>
                      <p className="text-sm text-gray-600">Get reminded about upcoming appointments</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('appointments')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        notifications.appointments ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          notifications.appointments ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Privacy & Security</h3>
              <div className="space-y-6 max-w-md">
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <Shield className="w-12 h-12 text-blue-600 mb-4" />
                  <h4 className="font-bold text-gray-800 mb-2">Data Protection</h4>
                  <p className="text-sm text-gray-600">
                    Your health data is encrypted and securely stored. We follow HIPAA compliance standards to protect your privacy.
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800 mb-2">Account Security</p>
                  <p className="text-sm text-gray-600">
                    Enable two-factor authentication and use a strong password to keep your account secure.
                  </p>
                </div>
                
                {/* Delete Account Section - UPDATED */}
                <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-2">Danger Zone</p>
                      <p className="text-sm text-gray-700 mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4 ml-4 list-disc">
                        <li>All your health data will be permanently deleted</li>
                        <li>Your appointments will be cancelled</li>
                        {isDoctor ? (
                          <li>All patient assignments will be removed</li>
                        ) : (
                          <li>All doctor connections will be removed</li>
                        )}
                        <li>This action cannot be reversed</li>
                      </ul>
                    </div>
                  </div>
                  
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center space-x-2 w-full justify-center bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete My Account</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-red-800">
                        Type "DELETE" to confirm account deletion:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE here"
                        className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting || deleteConfirmText !== 'DELETE'}
                          className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          disabled={deleting}
                          className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}