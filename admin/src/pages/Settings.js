import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Globe, 
  Shield, 
  Mail, 
  Database, 
  Bell, 
  Users, 
  FileText,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    // General Settings
    general: {
      siteName: 'AI.ttorney Admin',
      siteDescription: 'Legal AI Assistant Administration Panel',
      timezone: 'UTC+08:00',
      dateFormat: 'MM/DD/YYYY',
      language: 'en'
    },
    // Forum Settings
    forum: {
      postsPerPage: 20,
      allowAnonymous: true,
      requireModeration: false,
      maxPostLength: 5000,
      allowedCategories: ['family', 'criminal', 'civil', 'labor', 'corporate', 'property', 'tax', 'constitutional', 'administrative', 'other']
    },
    // User Management
    users: {
      requireEmailVerification: true,
      allowSelfRegistration: true,
      defaultRole: 'user',
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5
    },
    // Security Settings
    security: {
      enableTwoFactor: false,
      passwordMinLength: 8,
      requireSpecialChars: true,
      sessionSecure: true,
      enableAuditLog: true
    },
    // Email Settings
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@aittorney.com',
      fromName: 'AI.ttorney'
    },
    // Notification Settings
    notifications: {
      emailNotifications: true,
      newUserRegistration: true,
      forumReports: true,
      systemAlerts: true,
      maintenanceMode: false
    }
  });

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'forum', label: 'Forum', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell }
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

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site Name
        </label>
        <input
          type="text"
          value={settings.general.siteName}
          onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site Description
        </label>
        <textarea
          value={settings.general.siteDescription}
          onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={settings.general.timezone}
            onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="UTC+08:00">UTC+08:00 (Asia/Manila)</option>
            <option value="UTC+00:00">UTC+00:00 (GMT)</option>
            <option value="UTC-05:00">UTC-05:00 (EST)</option>
            <option value="UTC-08:00">UTC-08:00 (PST)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Format
          </label>
          <select
            value={settings.general.dateFormat}
            onChange={(e) => updateSetting('general', 'dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderForumSettings = () => (
    <div className="space-y-6">
      {/* Forum Configuration Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Forum Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posts Per Page
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={settings.forum.postsPerPage}
              onChange={(e) => updateSetting('forum', 'postsPerPage', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Number of posts to display per page (10-100)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Post Length (characters)
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={settings.forum.maxPostLength}
              onChange={(e) => updateSetting('forum', 'maxPostLength', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Maximum characters allowed per post (100-10000)</p>
          </div>
        </div>
      </div>

      {/* Posting Permissions Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Posting Permissions</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="allowAnonymous"
              checked={settings.forum.allowAnonymous}
              onChange={(e) => updateSetting('forum', 'allowAnonymous', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <div className="ml-3">
              <label htmlFor="allowAnonymous" className="block text-sm font-medium text-gray-900">
                Allow Anonymous Posts
              </label>
              <p className="text-xs text-gray-500">Users can post without revealing their identity</p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="requireModeration"
              checked={settings.forum.requireModeration}
              onChange={(e) => updateSetting('forum', 'requireModeration', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <div className="ml-3">
              <label htmlFor="requireModeration" className="block text-sm font-medium text-gray-900">
                Require Post Moderation
              </label>
              <p className="text-xs text-gray-500">All posts must be approved before being visible</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserSettings = () => (
    <div className="space-y-6">
      {/* Session Management */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.users.sessionTimeout}
              onChange={(e) => updateSetting('users', 'sessionTimeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Hours before user sessions expire (1-168)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Login Attempts
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={settings.users.maxLoginAttempts}
              onChange={(e) => updateSetting('users', 'maxLoginAttempts', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Failed attempts before account lockout (3-10)</p>
          </div>
        </div>
      </div>

      {/* Registration Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Registration Settings</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="requireEmailVerification"
              checked={settings.users.requireEmailVerification}
              onChange={(e) => updateSetting('users', 'requireEmailVerification', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <div className="ml-3">
              <label htmlFor="requireEmailVerification" className="block text-sm font-medium text-gray-900">
                Require Email Verification
              </label>
              <p className="text-xs text-gray-500">Users must verify their email before accessing the platform</p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="allowSelfRegistration"
              checked={settings.users.allowSelfRegistration}
              onChange={(e) => updateSetting('users', 'allowSelfRegistration', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <div className="ml-3">
              <label htmlFor="allowSelfRegistration" className="block text-sm font-medium text-gray-900">
                Allow Self Registration
              </label>
              <p className="text-xs text-gray-500">Users can register accounts without admin approval</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Security Configuration
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Changes to security settings will affect all users and may require re-authentication.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Password Length
          </label>
          <input
            type="number"
            min="6"
            max="32"
            value={settings.security.passwordMinLength}
            onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableTwoFactor"
            checked={settings.security.enableTwoFactor}
            onChange={(e) => updateSetting('security', 'enableTwoFactor', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enableTwoFactor" className="ml-2 block text-sm text-gray-900">
            Enable Two-Factor Authentication
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="requireSpecialChars"
            checked={settings.security.requireSpecialChars}
            onChange={(e) => updateSetting('security', 'requireSpecialChars', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="requireSpecialChars" className="ml-2 block text-sm text-gray-900">
            Require Special Characters in Passwords
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableAuditLog"
            checked={settings.security.enableAuditLog}
            onChange={(e) => updateSetting('security', 'enableAuditLog', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enableAuditLog" className="ml-2 block text-sm text-gray-900">
            Enable Audit Logging
          </label>
        </div>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              SMTP Configuration
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Configure your SMTP server to enable email notifications and user communications.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Host
          </label>
          <input
            type="text"
            value={settings.email.smtpHost}
            onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
            placeholder="smtp.gmail.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Port
          </label>
          <input
            type="number"
            value={settings.email.smtpPort}
            onChange={(e) => updateSetting('email', 'smtpPort', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Email
          </label>
          <input
            type="email"
            value={settings.email.fromEmail}
            onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Name
          </label>
          <input
            type="text"
            value={settings.email.fromName}
            onChange={(e) => updateSetting('email', 'fromName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="emailNotifications"
            checked={settings.notifications.emailNotifications}
            onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
            Enable Email Notifications
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="newUserRegistration"
            checked={settings.notifications.newUserRegistration}
            onChange={(e) => updateSetting('notifications', 'newUserRegistration', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="newUserRegistration" className="ml-2 block text-sm text-gray-900">
            Notify on New User Registration
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="forumReports"
            checked={settings.notifications.forumReports}
            onChange={(e) => updateSetting('notifications', 'forumReports', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="forumReports" className="ml-2 block text-sm text-gray-900">
            Notify on Forum Reports
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="systemAlerts"
            checked={settings.notifications.systemAlerts}
            onChange={(e) => updateSetting('notifications', 'systemAlerts', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="systemAlerts" className="ml-2 block text-sm text-gray-900">
            System Alerts
          </label>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.notifications.maintenanceMode}
              onChange={(e) => updateSetting('notifications', 'maintenanceMode', e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
              <span className="text-red-600 font-medium">Maintenance Mode</span>
              <span className="block text-xs text-gray-500">Temporarily disable user access</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'forum':
        return renderForumSettings();
      case 'users':
        return renderUserSettings();
      case 'security':
        return renderSecuritySettings();
      case 'email':
        return renderEmailSettings();
      case 'notifications':
        return renderNotificationSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your application settings</p>
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
