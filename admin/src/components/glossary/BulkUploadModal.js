import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Upload, Download, FileText, X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const BulkUploadModal = ({ open, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState([]);
  const [validationResults, setValidationResults] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setPreview([]);
      setValidationResults(null);
      setLoading(false);
    }
  }, [open]);

  // Category options matching the database enum
  const validCategories = ['family', 'criminal', 'civil', 'labor', 'consumer'];

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = ['term_en', 'term_fil', 'definition_en', 'definition_fil', 'example_en', 'example_fil', 'category', 'verified'];
    const sampleData = [
      ['Contract', 'Kontrata', 'A legally binding agreement between parties', 'Isang legal na kasunduan sa pagitan ng mga partido', 'The contract was signed by both parties', 'Ang kontrata ay nilagdaan ng dalawang partido', 'civil', 'true'],
      ['Custody', 'Pag-aalaga', 'Legal guardianship of a child', 'Legal na pag-aalaga ng isang bata', 'The mother was granted custody of the children', 'Ang ina ay binigyan ng pag-aalaga ng mga bata', 'family', 'true'],
      ['Theft', 'Pagnanakaw', 'The act of stealing property', 'Ang pagkuha ng ari-arian nang walang pahintulot', 'He was charged with theft', 'Siya ay kinasuhan ng pagnanakaw', 'criminal', 'false']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'glossary_terms_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Validate headers
    const requiredHeaders = ['term_en', 'term_fil', 'definition_en', 'definition_fil', 'example_en', 'example_fil', 'category', 'verified'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted values)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // Create object from values
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
      });

      data.push(row);
    }

    return data;
  };

  // Validate term data
  const validateTerm = (term, index) => {
    const errors = [];

    // Required field validation
    if (!term.term_en || term.term_en.trim().length < 2) {
      errors.push('English term is required (min 2 characters)');
    }
    if (!term.term_fil || term.term_fil.trim().length < 2) {
      errors.push('Filipino term is required (min 2 characters)');
    }
    if (!term.definition_en || term.definition_en.trim().length < 2) {
      errors.push('English definition is required (min 2 characters)');
    }
    if (!term.definition_fil || term.definition_fil.trim().length < 2) {
      errors.push('Filipino definition is required (min 2 characters)');
    }
    if (!term.example_en || term.example_en.trim().length < 2) {
      errors.push('English example is required (min 2 characters)');
    }
    if (!term.example_fil || term.example_fil.trim().length < 2) {
      errors.push('Filipino example is required (min 2 characters)');
    }

    // Category validation
    if (!term.category) {
      errors.push('Category is required');
    } else if (!validCategories.includes(term.category.toLowerCase())) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // Verified validation
    if (term.verified !== undefined && term.verified !== null && term.verified !== '') {
      const verifiedValue = String(term.verified).toLowerCase();
      if (verifiedValue !== 'true' && verifiedValue !== 'false') {
        errors.push('Verified must be "true" or "false"');
      }
    }

    return {
      index: index + 1,
      term: term.term_en,
      valid: errors.length === 0,
      errors
    };
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsedData = parseCSV(text);
        
        // Validate all terms
        const validations = parsedData.map((term, index) => validateTerm(term, index));
        const validTerms = validations.filter(v => v.valid).length;
        const invalidTerms = validations.filter(v => !v.valid).length;

        setPreview(parsedData.slice(0, 5)); // Show first 5 rows
        setValidationResults({
          total: parsedData.length,
          valid: validTerms,
          invalid: invalidTerms,
          details: validations
        });
      } catch (err) {
        setError(err.message);
        setFile(null);
        setPreview([]);
        setValidationResults(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!file || !validationResults) return;

    if (validationResults.invalid > 0) {
      setError(`Cannot upload: ${validationResults.invalid} invalid term(s) found. Please fix errors in your CSV file.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const parsedData = parseCSV(text);

          // Get current admin user info
          const currentAdmin = JSON.parse(localStorage.getItem('admin_user') || '{}');
          const adminName = currentAdmin.full_name || currentAdmin.email || 'Admin';

          // Prepare terms for upload
          const terms = parsedData.map(term => {
            const isVerified = String(term.verified || 'false').toLowerCase() === 'true';
            
            return {
              term_en: term.term_en.trim(),
              term_fil: term.term_fil.trim() || null,
              definition_en: term.definition_en.trim() || null,
              definition_fil: term.definition_fil.trim() || null,
              example_en: term.example_en.trim() || null,
              example_fil: term.example_fil.trim() || null,
              category: term.category.toLowerCase(),
              is_verified: isVerified,
              verified_by: isVerified ? adminName : null
            };
          });

          // Call the onUpload callback with the terms array
          await onUpload(terms);

          // Close modal on success
          onClose();
        } catch (err) {
          setError(err.message || 'Failed to upload terms');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err.message || 'Failed to upload terms');
      setLoading(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Bulk Upload Glossary Terms"
      width="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="text-xs font-semibold text-blue-900 mb-2">📋 Instructions</h4>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Download the CSV template below</li>
            <li>Fill in your glossary terms following the template format</li>
            <li>Set "verified" column to "true" or "false" for each term</li>
            <li>Save the file as CSV format</li>
            <li>Upload the completed CSV file</li>
          </ol>
          <div className="mt-2 text-[10px] text-blue-700 space-y-1">
            <div><strong>Valid categories:</strong> Family, Criminal, Civil, Labor, Consumer</div>
            <div><strong>Verified values:</strong> true (verified) or false (unverified)</div>
          </div>
        </div>

        {/* Download Template Button */}
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[#023D7B] bg-white border border-[#023D7B] rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#023D7B]"
        >
          <Download size={16} />
          Download CSV Template
        </button>

        {/* File Upload */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-[#023D7B] hover:bg-blue-50 transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-xs text-gray-600">
                {file ? file.name : 'Click to select CSV file'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setValidationResults(null);
                  setError(null);
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                disabled={loading}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Validation Results */}
        {validationResults && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-center">
                <div className="text-lg font-bold text-gray-900">{validationResults.total}</div>
                <div className="text-[10px] text-gray-600">Total Terms</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-2 text-center">
                <div className="text-lg font-bold text-green-700">{validationResults.valid}</div>
                <div className="text-[10px] text-green-700">Valid</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-2 text-center">
                <div className="text-lg font-bold text-red-700">{validationResults.invalid}</div>
                <div className="text-[10px] text-red-700">Invalid</div>
              </div>
            </div>

            {/* Validation Details */}
            {validationResults.invalid > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-48 overflow-y-auto">
                <h4 className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                  <XCircle size={14} />
                  Validation Errors
                </h4>
                <div className="space-y-2">
                  {validationResults.details
                    .filter(v => !v.valid)
                    .map((validation, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="font-medium text-red-800">
                          Row {validation.index}: {validation.term || 'Unknown'}
                        </div>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          {validation.errors.map((err, errIdx) => (
                            <li key={errIdx} className="text-red-700">• {err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
              <FileText size={14} />
              Preview (First 5 rows)
            </h4>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-700">English</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-700">Filipino</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-700">Category</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((term, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5 text-[10px] text-gray-900">{term.term_en}</td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-900">{term.term_fil}</td>
                        <td className="px-2 py-1.5 text-[10px] text-gray-900">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {term.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !file || !validationResults || validationResults.invalid > 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#023D7B] border border-transparent rounded-md hover:bg-[#013462] focus:outline-none focus:ring-2 focus:ring-[#023D7B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload {validationResults ? `${validationResults.valid} Terms` : 'Terms'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkUploadModal;
