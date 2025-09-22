import React from 'react';
import Modal from '../ui/Modal';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

const ViewLawyerApplicationModal = ({ open, onClose, application, loading = false }) => {
  if (!application && !loading) return <Modal open={open} onClose={onClose} title="Lawyer Application Details" />;
  
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Lawyer Application Details" width="max-w-2xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading application details...</p>
          </div>
        </div>
      </Modal>
    );
  }


  // Extract the actual application data from the API response
  const applicationData = application?.data || application;
  
  const {
    full_name: name,
    roll_number: rollNumber,
    roll_signing_date: rollSignDate,
    submitted_at: registered,
    ibp_id: ibpCardPath,
    selfie: selfiePath,
    matched_roll_id: matchedRollId,
    status,
  } = applicationData || {};

  // Get email from nested users object
  const email = applicationData?.users?.email;
  
  // Set PRA status based on whether roll is matched
  const praStatus = matchedRollId ? 'matched' : 'not_found';

  // Component to load images from private Supabase Storage using signed URLs
  const SecureImage = ({ imagePath, alt, className, primaryBucket }) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [currentBucketIndex, setCurrentBucketIndex] = React.useState(0);

    // Possible bucket names to try
    const possibleBuckets = [
      primaryBucket,
      'uploads',
      'images', 
      'lawyer-documents',
      'application-files',
      'documents',
      'files'
    ].filter(Boolean);

    // Load signed URL when component mounts or imagePath changes
    React.useEffect(() => {
      if (!imagePath) return;

      const loadSignedUrl = async () => {
        setLoading(true);
        setError(null);
        setImageLoaded(false);
        setCurrentBucketIndex(0);

        // Try each bucket until we find the image
        for (let i = 0; i < possibleBuckets.length; i++) {
          try {
            setCurrentBucketIndex(i);
            const signedUrl = await lawyerApplicationsService.getSignedUrl(possibleBuckets[i], imagePath);
            setImageUrl(signedUrl);
            setLoading(false);
            return; // Success, exit the loop
          } catch (err) {
            // Continue to next bucket
            continue;
          }
        }

        // If we get here, all buckets failed
        setError('Image not found in any bucket');
        setLoading(false);
      };

      loadSignedUrl();
    }, [imagePath]);

    if (!imagePath) {
      return (
        <div className="w-full h-48 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[11px] text-gray-500">
          No image available
        </div>
      );
    }

    if (loading) {
      return (
        <div className="w-full h-48 rounded-md border border-gray-200 bg-gray-100 grid place-items-center text-[11px] text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
            <p>Loading secure image...</p>
            <p className="text-[10px] text-gray-400 mt-1">Trying: {possibleBuckets[currentBucketIndex]}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-48 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[11px] text-gray-500">
          <div className="text-center">
            <p>Failed to load image</p>
            <p className="text-[10px] text-gray-400 mt-1">Tried buckets: {possibleBuckets.join(', ')}</p>
            <p className="text-[10px] text-gray-400">File: {imagePath}</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          onError={() => setError('Failed to load image')}
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        {!imageLoaded && imageUrl && (
          <div className="w-full h-48 rounded-md border border-gray-200 bg-gray-100 grid place-items-center text-[11px] text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p>Loading image...</p>
            </div>
          </div>
        )}
      </>
    );
  };


  const RollMatchBadge = ({ status }) => {
    const s = (status || '').toLowerCase();
    const isMatched = s === 'matched';
    const styles = isMatched
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200';
    const label = isMatched ? 'Matched' : 'Not Found';
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles}`}>
        {label}
      </span>
    );
  };

  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    });
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const getStatusStyles = (status) => {
      switch (status?.toLowerCase()) {
        case 'approved':
        case 'accepted':
          return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case 'rejected':
          return 'bg-red-50 text-red-700 border border-red-200';
        case 'resubmission':
          return 'bg-orange-50 text-orange-700 border border-orange-200';
        case 'pending':
        default:
          return 'bg-amber-50 text-amber-700 border border-amber-200';
      }
    };

    const getStatusLabel = (status) => {
      switch (status?.toLowerCase()) {
        case 'approved': return 'Approved';
        case 'accepted': return 'Accepted';
        case 'rejected': return 'Rejected';
        case 'resubmission': return 'Resubmission';
        case 'pending': return 'Pending';
        default: return status || 'Pending';
      }
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyles(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Lawyer Application Details" width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-500">Full Name</div>
            <div className="text-sm font-medium text-gray-900">{name || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Email</div>
            <div className="text-sm font-medium text-gray-900">{email || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Roll Number</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900">{rollNumber || '-'}</div>
              <RollMatchBadge status={praStatus} />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Application Status</div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Roll Sign Date</div>
            <div className="text-sm font-medium text-gray-900">{formatDate(rollSignDate)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500">Application Date</div>
            <div className="text-sm font-medium text-gray-900">{formatDate(registered)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-1">IBP Card</div>
            <SecureImage 
              imagePath={ibpCardPath}
              alt="IBP Card"
              className="w-full h-48 object-cover rounded-md border border-gray-200"
              primaryBucket="ibp-ids"
            />
          </div>
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-1">Live Selfie</div>
            <SecureImage 
              imagePath={selfiePath}
              alt="Live Selfie"
              className="w-full h-48 object-cover rounded-md border border-gray-200"
              primaryBucket="selfie-ids"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewLawyerApplicationModal;
