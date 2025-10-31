import React from 'react';
import Modal from '../ui/Modal';
import { User, Mail, Calendar, FileText, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const getStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-green-100 text-green-800 border border-green-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStyles(status)}`}>
      {status || 'Active'}
    </span>
  );
};

const ConsultationBadge = ({ accepting }) => {
  const styles = accepting 
    ? 'bg-green-50 text-green-700 border border-green-200' 
    : 'bg-gray-50 text-gray-700 border border-gray-200';

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles}`}>
      {accepting ? (
        <>
          <CheckCircle size={12} className="mr-1" />
          Accepting
        </>
      ) : (
        <>
          <XCircle size={12} className="mr-1" />
          Not Accepting
        </>
      )}
    </span>
  );
};

const ViewLawyerModal = ({ open, onClose, lawyer, loading = false }) => {
  // Extract the actual lawyer data from the API response
  const lawyerData = lawyer?.data || lawyer;

  // Format date for display
  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Manila'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
  };


  if (!lawyerData && !loading) {
    return (
      <Modal open={open} onClose={onClose} title="View Lawyer Details">
        <div className="text-center py-8">
          <p className="text-gray-500">No lawyer data available</p>
        </div>
      </Modal>
    );
  }
  
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="View Lawyer Details" width="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading lawyer details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Lawyer Details"
      width="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Header with Status */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{lawyerData.full_name || 'Unknown Lawyer'}</h3>
            <p className="text-sm text-gray-500 mt-1">{lawyerData.email || 'No email provided'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={lawyerData.status} />
            <ConsultationBadge accepting={lawyerData.accepting_consultations} />
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <User size={16} className="mr-2 text-[#023D7B]" />
            Basic Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Full Name</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.full_name || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Username</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.username || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.email || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Phone Number</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.phone_number || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Registration Date</div>
              <div className="text-sm text-gray-700">{formatDate(lawyerData.registration_date)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Last Updated</div>
              <div className="text-sm text-gray-700">
                {lawyerData.updated_at ? formatDate(lawyerData.updated_at) : 
                 lawyerData.registration_date ? formatDate(lawyerData.registration_date) : 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Shield size={16} className="mr-2 text-[#023D7B]" />
            Professional Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Roll Number</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.roll_number || 'Not provided'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Roll Sign Date</div>
              <div className="text-sm text-gray-700">{formatDate(lawyerData.roll_sign_date, false)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Years of Experience</div>
              <div className="text-sm text-gray-700">
                {lawyerData.years_of_experience ? `${lawyerData.years_of_experience} years` : 'Not specified'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Verification Status</div>
              <div className="text-sm text-gray-700">
                {lawyerData.is_verified ? (
                  <span className="text-green-600 font-medium">✓ Verified</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Not Verified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Consultation Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Calendar size={16} className="mr-2 text-[#023D7B]" />
            Consultation Information
          </h4>
          <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Accepting Consultations</div>
              <div className="text-sm text-gray-700 mt-1">
                <ConsultationBadge accepting={lawyerData.accepting_consultations} />
              </div>
            </div>
          </div>
        </div>

        {/* Specializations */}
        {lawyerData.specializations && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <FileText size={16} className="mr-2 text-[#023D7B]" />
              Specializations
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              {Array.isArray(lawyerData.specializations) && lawyerData.specializations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {lawyerData.specializations.map((spec, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No specializations listed</p>
              )}
            </div>
          </div>
        )}

        {/* Professional Bio */}
        {lawyerData.bio && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <FileText size={16} className="mr-2 text-[#023D7B]" />
              Professional Bio
            </h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {lawyerData.bio}
              </p>
            </div>
          </div>
        )}

        {/* Account Statistics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Clock size={16} className="mr-2 text-[#023D7B]" />
            Account Statistics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Account Status</div>
              <div className="text-sm text-gray-700 mt-1">
                <StatusBadge status={lawyerData.status} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Forum Posts</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.post_count || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Consultations</div>
              <div className="text-sm font-medium text-gray-900">{lawyerData.consultation_count || 0}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewLawyerModal;
