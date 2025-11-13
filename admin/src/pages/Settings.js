import React, { useState, useEffect } from "react";
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
  EyeOff,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/Toast";
import Modal from "../components/ui/Modal";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { admin, getAuthHeader, refreshToken } = useAuth();
  const { showSuccess, showError, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    joinedDate: "",
    role: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage:
      "The system is currently under maintenance. Please check back later.",
    allowAdminAccess: true,
    scheduledMaintenance: false,
    maintenanceStart: "",
    maintenanceEnd: "",
  });

  const tabs = [
    { id: "profile", label: "Profile Management", icon: User },
    { id: "maintenance", label: "Maintenance Mode", icon: Wrench },
  ];

  const handleSave = () => {
    setConfirmOpen(true);
  };

  const performSave = async () => {
    setConfirmBusy(true);
    try {
      const firstName = (profileData.firstName || '').trim();
      const lastName = (profileData.lastName || '').trim();
      const wantPasswordChange = Boolean(profileData.currentPassword || profileData.newPassword || profileData.confirmPassword);
      if (wantPasswordChange) {
        if (!profileData.currentPassword || !profileData.newPassword || !profileData.confirmPassword) {
          throw new Error('Please fill out all password fields.');
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
          throw new Error('New password and confirm password do not match.');
        }
        if (profileData.newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(profileData.newPassword)) {
          throw new Error('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
        }
      }

      const updates = [];
      if (firstName || lastName) {
        updates.push(
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ firstName, lastName }),
          })
        );
      }
      if (wantPasswordChange) {
        updates.push(
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ currentPassword: profileData.currentPassword, newPassword: profileData.newPassword }),
          })
        );
      }

      // Maintenance settings update
      const maintenancePayload = {
        is_active: Boolean(maintenanceSettings.maintenanceMode),
        message: maintenanceSettings.maintenanceMessage || '',
        allow_admin: Boolean(maintenanceSettings.allowAdminAccess),
        // Send exactly what the input holds so DB and UI match
        start_time: maintenanceSettings.scheduledMaintenance && maintenanceSettings.maintenanceStart
          ? maintenanceSettings.maintenanceStart
          : null,
        end_time: maintenanceSettings.scheduledMaintenance && maintenanceSettings.maintenanceEnd
          ? maintenanceSettings.maintenanceEnd
          : null,
      };
      updates.push(
        fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/maintenance`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(maintenancePayload),
        })
      );

      for (const p of updates) {
        const resp = await p;
        const data = await resp.json();
        if (!resp.ok || data?.success !== true) {
          throw new Error(data?.error || 'Update failed');
        }
      }

      await refreshToken();
      setSaved(true);
      showSuccess(wantPasswordChange ? 'Profile, password, and maintenance settings updated.' : 'Settings saved successfully.');
      setTimeout(() => setSaved(false), 1500);
      setConfirmOpen(false);
      setProfileData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (e) {
      showError(e.message || 'Failed to save settings.');
    } finally {
      setConfirmBusy(false);
      setLoading(false);
    }
  };

  // Load current admin into profileData
  useEffect(() => {
    if (!admin) return;
    const fullName = admin.full_name || "";
    const firstName = admin.first_name || fullName.split(" ")[0] || "";
    const lastName = admin.last_name || (fullName.split(" ").slice(1).join(" ") || "");
    setProfileData((prev) => ({
      ...prev,
      firstName,
      lastName,
      email: admin.email || "",
      joinedDate: admin.created_at || admin.createdAt || "",
      role: admin.role || "admin",
    }));
    (async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/joined`, {
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
        });
        const data = await resp.json();
        if (resp.ok && data?.success && data.created_at) {
          setProfileData((prev) => ({ ...prev, joinedDate: data.created_at }));
        }
      } catch {}
    })();
  }, [admin]);

  // Load maintenance settings
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/maintenance`, {
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        });
        const data = await resp.json();
        if (resp.ok && data?.success && data.maintenance) {
          const m = data.maintenance;
          setMaintenanceSettings((prev) => ({
            ...prev,
            maintenanceMode: Boolean(m.is_active),
            maintenanceMessage: m.message || '',
            allowAdminAccess: m.allow_admin !== undefined ? Boolean(m.allow_admin) : true,
            scheduledMaintenance: Boolean(m.start_time || m.end_time),
            // Use values from DB exactly as-is to match datetime-local expected format
            maintenanceStart: m.start_time || '',
            maintenanceEnd: m.end_time || '',
          }));
        }
      } catch (err) {
        // ignore load errors, UI remains editable
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfileData = (key, value) => {
    setProfileData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateMaintenanceSettings = (key, value) => {
    setMaintenanceSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getRoleLabel = (role) => {
    if (!role) return '-';
    const r = String(role).toLowerCase();
    if (r === 'admin') return 'Administrator';
    if (r === 'superadmin') return 'Super Admin';
    return r
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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
      <ToastContainer />
      {/* Profile Picture Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Profile Picture
        </h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <label
              htmlFor="profile-picture"
              className="absolute bottom-0 right-0 bg-[#023D7B] rounded-full p-1 cursor-pointer hover:bg-[#013964] transition-colors"
            >
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
            <p className="text-sm text-gray-600">
              Upload a new profile picture
            </p>
            <p className="text-xs text-gray-500">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Personal Information
        </h3>
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={profileData.firstName}
                onChange={(e) => updateProfileData("firstName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) => updateProfileData("lastName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account Information (Read-only) */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Account Information
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Joined Date
            </span>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {profileData.joinedDate ? new Date(profileData.joinedDate).toLocaleDateString() : "-"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Account Type
            </span>
            <span className="text-sm text-[#023D7B] font-medium">
              {getRoleLabel(profileData.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={profileData.currentPassword}
                onChange={(e) =>
                  updateProfileData("currentPassword", e.target.value)
                }
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
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
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={profileData.newPassword}
                  onChange={(e) =>
                    updateProfileData("newPassword", e.target.value)
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={profileData.confirmPassword}
                  onChange={(e) =>
                    updateProfileData("confirmPassword", e.target.value)
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
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

          <div className="bg-[#023D7B]/10 border border-[#023D7B]/30 rounded-lg p-4">
            <div className="flex">
              <Info className="h-5 w-5 text-[#023D7B]" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-[#023D7B]">
                  Password Requirements
                </h3>
                <p className="mt-1 text-sm text-[#023D7B]">
                  Password must be at least 8 characters long and contain
                  uppercase, lowercase, numbers, and special characters.
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
          <h3 className="text-lg font-medium text-gray-900">
            Maintenance Status
          </h3>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              maintenanceSettings.maintenanceMode
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {maintenanceSettings.maintenanceMode
              ? "Maintenance Active"
              : "System Online"}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={maintenanceSettings.maintenanceMode}
              onChange={(e) =>
                updateMaintenanceSettings("maintenanceMode", e.target.checked)
              }
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
            />
            <div className="ml-3 flex-1">
              <label
                htmlFor="maintenanceMode"
                className="block text-sm font-medium text-gray-900"
              >
                <span className="text-red-600 font-medium">
                  Enable Maintenance Mode
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, users will see a maintenance message and cannot
                access the application
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
                    The application is currently in maintenance mode. Users
                    cannot access the system.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Message */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Maintenance Message
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Display to Users
            </label>
            <textarea
              value={maintenanceSettings.maintenanceMessage}
              onChange={(e) =>
                updateMaintenanceSettings("maintenanceMessage", e.target.value)
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter the message users will see during maintenance..."
            />
            <p className="mt-1 text-xs text-gray-500">
              This message will be displayed to users when they try to access
              the application during maintenance
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowAdminAccess"
              checked={maintenanceSettings.allowAdminAccess}
              onChange={(e) =>
                updateMaintenanceSettings("allowAdminAccess", e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="allowAdminAccess"
              className="ml-2 block text-sm text-gray-900"
            >
              Allow Administrator Access During Maintenance
            </label>
          </div>
        </div>
      </div>

      {/* Scheduled Maintenance */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Scheduled Maintenance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="scheduledMaintenance"
              checked={maintenanceSettings.scheduledMaintenance}
              onChange={(e) =>
                updateMaintenanceSettings(
                  "scheduledMaintenance",
                  e.target.checked
                )
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="scheduledMaintenance"
              className="ml-2 block text-sm text-gray-900"
            >
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
                  onChange={(e) =>
                    updateMaintenanceSettings(
                      "maintenanceStart",
                      e.target.value
                    )
                  }
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
                  onChange={(e) =>
                    updateMaintenanceSettings("maintenanceEnd", e.target.value)
                  }
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
                    The system will automatically enter maintenance mode at the
                    specified start time and exit at the end time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Maintenance Page Preview
        </h3>
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="text-center">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              System Under Maintenance
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {maintenanceSettings.maintenanceMessage}
            </p>
            {maintenanceSettings.scheduledMaintenance && maintenanceSettings.maintenanceEnd && (
              <p className="text-sm text-gray-500 mt-4">
                Expected to be back online: {maintenanceSettings.maintenanceEnd}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileManagement();
      case "maintenance":
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
          <h1 className="text-2xl font-bold text-gray-900">
            Profile & System Management
          </h1>
          <p className="text-gray-600">
            Manage your profile and system maintenance settings
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2 bg-[#023D7B] text-white px-4 py-2 rounded-lg hover:bg-[#013964] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {loading ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </span>
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
                      ? "border-[#023D7B] text-[#023D7B]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
        <div className="p-6">{renderTabContent()}</div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => (confirmBusy ? null : setConfirmOpen(false))}
        title="Confirm Save"
        showCloseButton={!confirmBusy}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Save the changes to your profile{(profileData.currentPassword || profileData.newPassword || profileData.confirmPassword) ? ' and update your password' : ''}?</p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={confirmBusy}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={performSave}
              disabled={confirmBusy}
              className="px-3 py-2 text-sm bg-[#023D7B] text-white rounded-md hover:bg-[#013964] disabled:opacity-50"
            >
              {confirmBusy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
