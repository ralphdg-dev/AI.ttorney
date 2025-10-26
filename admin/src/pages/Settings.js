import React, { useState, useEffect } from 'react';
import { 
  Save, 
  User, 
  Lock, 
  Camera,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Wrench,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@aittorney.com',
    birthday: '1990-01-01',
    joinedDate: '2024-01-15',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'The system is currently under maintenance. Please check back later.',
    allowAdminAccess: true,
    scheduledMaintenance: false,
    maintenanceStart: '',
    maintenanceEnd: ''
  });

  const tabs = [
    { id: 'profile', label: 'Profile Management', icon: User },
    { id: 'maintenance', label: 'Maintenance Mode', icon: Wrench }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would typically save to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileData = (key, value) => {
    setProfileData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateMaintenanceSettings = (key, value) => {
    setMaintenanceSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderProfileManagement = () => (
    <div className="space-y-8">
      {/* Profile Picture Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <label htmlFor="profile-picture" className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera className="w-4 h-4 text-white" />
            </label>
            <input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm text-gray-600">Upload a new profile picture</p>
            <p className="text-xs text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">First Name</label>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-base font-medium text-gray-900">{profileData.firstName}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-base font-medium text-gray-900">{profileData.lastName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <span className="text-base font-medium text-gray-900">{profileData.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Birthday</label>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-base font-medium text-gray-900">
                  {new Date(profileData.birthday).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-6">Account Information</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Joined Date</label>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-base font-medium text-gray-900">
                  {new Date(profileData.joinedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Type</label>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-base font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Administrator
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={profileData.currentPassword}
                onChange={(e) => updateProfileData('currentPassword', e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={profileData.newPassword}
                onChange={(e) => updateProfileData('newPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={profileData.confirmPassword}
                  onChange={(e) => updateProfileData('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Password Requirements</h3>
                <p className="mt-1 text-sm text-blue-700">
                  Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMaintenanceMode = () => (
    <div className="space-y-8">
      {/* Maintenance Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Maintenance Status</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            maintenanceSettings.maintenanceMode 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {maintenanceSettings.maintenanceMode ? 'Maintenance Active' : 'System Online'}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={maintenanceSettings.maintenanceMode}
              onChange={(e) => updateMaintenanceSettings('maintenanceMode', e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
            />
            <div className="ml-3 flex-1">
              <label htmlFor="maintenanceMode" className="block text-sm font-medium text-gray-900">
                <span className="text-red-600 font-medium">Enable Maintenance Mode</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, users will see a maintenance message and cannot access the application
              </p>
            </div>
          </div>

          {maintenanceSettings.maintenanceMode && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Maintenance Mode Active
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    The application is currently in maintenance mode. Users cannot access the system.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Message */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Message</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Display to Users
            </label>
            <textarea
              value={maintenanceSettings.maintenanceMessage}
              onChange={(e) => updateMaintenanceSettings('maintenanceMessage', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter the message users will see during maintenance..."
            />
            <p className="mt-1 text-xs text-gray-500">
              This message will be displayed to users when they try to access the application during maintenance
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowAdminAccess"
              checked={maintenanceSettings.allowAdminAccess}
              onChange={(e) => updateMaintenanceSettings('allowAdminAccess', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowAdminAccess" className="ml-2 block text-sm text-gray-900">
              Allow Administrator Access During Maintenance
            </label>
          </div>
        </div>
      </div>

      {/* Scheduled Maintenance */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Scheduled Maintenance</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="scheduledMaintenance"
              checked={maintenanceSettings.scheduledMaintenance}
              onChange={(e) => updateMaintenanceSettings('scheduledMaintenance', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="scheduledMaintenance" className="ml-2 block text-sm text-gray-900">
              Schedule Automatic Maintenance
            </label>
          </div>

          {maintenanceSettings.scheduledMaintenance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={maintenanceSettings.maintenanceStart}
                  onChange={(e) => updateMaintenanceSettings('maintenanceStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={maintenanceSettings.maintenanceEnd}
                  onChange={(e) => updateMaintenanceSettings('maintenanceEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {maintenanceSettings.scheduledMaintenance && (
            <div className="ml-7 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Scheduled Maintenance Info
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    The system will automatically enter maintenance mode at the specified start time and exit at the end time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Page Preview</h3>
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="text-center">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">System Under Maintenance</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {maintenanceSettings.maintenanceMessage}
            </p>
            {maintenanceSettings.scheduledMaintenance && maintenanceSettings.maintenanceEnd && (
              <p className="text-sm text-gray-500 mt-4">
                Expected to be back online: {new Date(maintenanceSettings.maintenanceEnd).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileManagement();
      case 'maintenance':
        return renderMaintenanceMode();
      default:
        return renderProfileManagement();
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile & System Management</h1>
          <p className="text-gray-600">Manage your profile and system maintenance settings</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
