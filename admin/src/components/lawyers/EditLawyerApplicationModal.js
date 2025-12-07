import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Save, X } from 'lucide-react';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';
import rollMatchService from '../../services/rollMatchService';
import RollMatchBadge from './RollMatchBadge';

const EditLawyerApplicationModal = ({ open, onClose, application, onSave }) => {
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for roll verification status
  const [praStatus, setPraStatus] = useState('unknown');

  // Initialize form data when modal opens
  useEffect(() => {
    if (open && application) {
      const applicationData = application?.data || application;
      setStatus(applicationData?.status || '');
      setNotes(applicationData?.notes || '');
      setError(null);
    }
  }, [open, application]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStatus('');
      setNotes('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!application) return;
    
    const applicationData = application?.data || application;
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare update data
      const updateData = {
        status: status.trim(),
        notes: notes.trim()
      };
      
      // Call the API to update the application
      const response = await lawyerApplicationsService.updateLawyerApplication(
        applicationData.id, 
        updateData
      );
      
      // Call the onSave callback to refresh the parent component
      if (onSave) {
        onSave(response.data);
      }
      
      // Close the modal
      onClose();
      
    } catch (err) {
      setError(err.message || 'Failed to update application');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const applicationData = application?.data || application;
  const fullName = applicationData?.users?.full_name || applicationData?.full_name;
  const rollNumber = applicationData?.roll_number;

  // Check roll number and add pra_status like the table does
  useEffect(() => {
    if (open && applicationData) {
      const checkRollNumber = async () => {
        try {
          const rollCheck = await rollMatchService.checkApplicationDetails({
            rollNumber: applicationData.roll_number,
            fullName: applicationData.full_name,
            rollSignDate: applicationData.roll_sign_date,
          });
          // Use state setters to trigger re-render
          setPraStatus(rollCheck.status);
        } catch (error) {
          console.error('Failed to check roll number:', error);
          setPraStatus('not_found');
        }
      };
      checkRollNumber();
    }
  }, [open, applicationData]);

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={`Edit Application - ${fullName || 'Unknown'}`}
      width="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {/* Roll Number Display */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Roll Number
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">{rollNumber || 'N/A'}</span>
            <RollMatchBadge
              status={praStatus}
              isArchived={applicationData?.archived === true}
            />
          </div>
        </div>
        
        {/* Application Status */}
        <div>
          <label htmlFor="status" className="block mb-1 text-sm font-medium text-gray-700">
            Application Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-[#023D7B] text-sm"
            required
          >
            <option value="">Select Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="resubmission">Resubmission</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-[#023D7B] text-sm resize-none"
            placeholder="Add notes about this application..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B] disabled:opacity-50"
          >
            <X size={16} className="inline mr-1" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !status.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#023D7B] border border-transparent rounded-md hover:bg-[#013462] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="inline w-4 h-4 mr-1 border-b-2 border-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="inline mr-1" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditLawyerApplicationModal;
