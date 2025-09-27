import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper function to format dates
const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  
  const options = {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

// Function to load image as base64
const loadImageAsBase64 = async (imagePath, primaryBucket = null) => {
  if (!imagePath) return null;
  
  // Try primary bucket first, then fallback to other buckets
  const buckets = primaryBucket 
    ? [primaryBucket, 'uploads', 'images', 'lawyer-documents', 'application-files', 'documents', 'files']
    : ['uploads', 'images', 'lawyer-documents', 'application-files', 'documents', 'files'];
  
  for (const bucket of buckets) {
    try {
      console.log(`Trying to load image from bucket: ${bucket}, path: ${imagePath}`);
      const signedUrl = await lawyerApplicationsService.getSignedUrl(bucket, imagePath);
      if (!signedUrl) {
        console.log(`No signed URL for bucket: ${bucket}`);
        continue;
      }
      
      console.log(`Got signed URL: ${signedUrl}`);
      const response = await fetch(signedUrl);
      if (!response.ok) {
        console.log(`Fetch failed for bucket ${bucket}:`, response.status);
        continue;
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        console.log(`Empty blob for bucket: ${bucket}`);
        continue;
      }
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log(`Successfully loaded image from bucket: ${bucket}`);
          resolve(reader.result);
        };
        reader.onerror = () => {
          console.log(`FileReader error for bucket: ${bucket}`);
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Error loading image from bucket ${bucket}:`, error);
      continue;
    }
  }
  
  console.log(`Failed to load image from all buckets: ${imagePath}`);
  return null;
};

// Add professional PDF header
const addPDFHeader = (doc, title, reportNumber) => {
  // Add professional header with logo placeholder
  doc.setFillColor(0, 0, 0);
  doc.rect(15, 15, 180, 25, 'F');
  
  // Company name/logo area
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('AI.ttorney', 20, 30);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Legal Application Management System', 20, 35);
  
  // Document title on the right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 130, 28);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report #${reportNumber}`, 130, 33);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 37);
  
  // Reset text color to black
  doc.setTextColor(0, 0, 0);
};

// Add applicant information section
const addApplicantInfo = (doc, fullName, email, totalRecords, yPos = 55) => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('APPLICANT INFORMATION', 20, yPos);
  
  // Draw line under header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, yPos + 2, 190, yPos + 2);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Left column
  doc.text('Name:', 20, yPos);
  doc.text(fullName || 'Unknown', 45, yPos);
  
  doc.text('Email:', 20, yPos + 6);
  doc.text(email || 'Unknown', 45, yPos + 6);
  
  // Right column
  doc.text('Generated:', 120, yPos);
  doc.text(new Date().toLocaleString(), 145, yPos);
  
  doc.text('Total Records:', 120, yPos + 6);
  doc.text(totalRecords.toString(), 145, yPos + 6);
  
  return yPos + 20;
};

// Add footer to all pages
const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    // Footer line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(20, 285, 190, 285);
    
    // Footer text
    doc.text('AI.ttorney Legal Application Management System', 20, 290);
    doc.text(`Page ${i} of ${pageCount}`, 170, 290);
  }
};

// Export application history PDF
export const exportApplicationHistoryPDF = async (history, fullName, email, application) => {
  console.log('Export history clicked', { history, historyLength: history?.length });
  
  if (!history || history.length === 0) {
    console.log('No history data available');
    alert('No application history data available to export');
    return;
  }
  
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: 'Application History Report',
      subject: `Application history for ${fullName || 'Unknown'}`,
      author: 'AI.ttorney Admin Panel',
      creator: 'AI.ttorney Admin Panel'
    });
    
    // Add header
    addPDFHeader(doc, 'APPLICATION HISTORY', Date.now().toString().slice(-6));
    
    // Add applicant information
    let yPos = addApplicantInfo(doc, fullName, email, history.length);
    
    // Prepare comprehensive table data with version column
    const tableHeaders = [
      'Version', 'Full Name', 'Roll Number', 'Status', 'Roll Signing Date',
      'Reviewed By', 'Reviewed At', 'Admin Notes', 'Submitted At'
    ];
    
    // Process all applications with images in a single comprehensive table
    const processedData = [];
    
    for (let i = 0; i < history.length; i++) {
      const app = history[i];
      const version = app.version || (history.length - i);
      
      // Load images for this application
      let ibpPath = app.ibp_id || app.ibp_card_path || app.ibp_card;
      let selfiePath = app.selfie || app.selfie_path || app.live_selfie;
      
      // If this is the current version (index 0), try to get paths from the main application data
      if (i === 0 && (!ibpPath || !selfiePath)) {
        ibpPath = ibpPath || application?.ibp_id || application?.ibp_card_path || application?.ibp_card;
        selfiePath = selfiePath || application?.selfie || application?.selfie_path || application?.live_selfie;
      }
      
      console.log('Processing version', version, ':', { ibpPath, selfiePath });
      
      // Load images
      const ibpImage = ibpPath ? await loadImageAsBase64(ibpPath, 'ibp-ids') : null;
      const selfieImage = selfiePath ? await loadImageAsBase64(selfiePath, 'selfie-ids') : null;
      
      // Get admin name for reviewed_by field
      const reviewedByName = app.admin_name || app.admin_full_name || '-';
      
      processedData.push({
        version,
        data: [
          `V${version}`,
          app.full_name || fullName || '-',
          app.roll_number || '-',
          capitalizeFirst(app.status || 'pending'),
          app.roll_signing_date ? formatDate(app.roll_signing_date, false) : '-',
          reviewedByName,
          app.reviewed_at ? formatDate(app.reviewed_at, false) : '-',
          app.admin_notes || '-',
          formatDate(app.submitted_at, false)
        ],
        images: { ibpImage, selfieImage, ibpPath, selfiePath }
      });
    }
    
    // Extract just the table data
    const tableData = processedData.map(item => item.data);

    // Add clean professional table with proper sizing
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }, // Version
        1: { cellWidth: 22, halign: 'left' }, // Full Name
        2: { cellWidth: 18, halign: 'center' }, // Roll Number
        3: { cellWidth: 16, halign: 'center' }, // Status
        4: { cellWidth: 18, halign: 'center' }, // Roll Signing Date
        5: { cellWidth: 18, halign: 'left' }, // Reviewed By
        6: { cellWidth: 18, halign: 'center' }, // Reviewed At
        7: { cellWidth: 30, halign: 'left' }, // Admin Notes
        8: { cellWidth: 18, halign: 'center' } // Submitted At
      },
      margin: { left: 15, right: 15 },
      tableWidth: 170,
      theme: 'grid'
    });
    
    // Add documents section after the main table
    let currentY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('APPLICATION DOCUMENTS', 20, currentY);
    
    // Draw line under header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, currentY + 2, 190, currentY + 2);
    currentY += 15;
    
    // Display images for each version
    for (let i = 0; i < processedData.length; i++) {
      const { version, images } = processedData[i];
      const { ibpImage, selfieImage } = images;
      
      // Check if we need a new page
      if (currentY > 220) {
        doc.addPage();
        currentY = 30;
      }
      
      // Version header with clean styling
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(20, currentY - 3, 170, 10);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Version ${version}`, 22, currentY + 3);
      currentY += 15;
      
      if (ibpImage || selfieImage) {
        let imageX = 15;
        
        // Add IBP Card image
        if (ibpImage) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text('IBP Card', imageX, currentY);
          
          try {
            // Add clean border
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(imageX, currentY + 2, 55, 40);
            
            doc.addImage(ibpImage, 'JPEG', imageX + 1, currentY + 3, 53, 38);
          } catch (imgError) {
            console.warn('Failed to add IBP image:', imgError);
            doc.setTextColor(0, 0, 0);
            doc.text('Image failed to load', imageX, currentY + 20);
          }
          
          imageX += 65;
        }
        
        // Add Selfie image
        if (selfieImage) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text('Selfie Photo', imageX, currentY);
          
          try {
            // Add clean border
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(imageX, currentY + 2, 55, 40);
            
            doc.addImage(selfieImage, 'JPEG', imageX + 1, currentY + 3, 53, 38);
          } catch (imgError) {
            console.warn('Failed to add selfie image:', imgError);
            doc.setTextColor(0, 0, 0);
            doc.text('Image failed to load', imageX, currentY + 20);
          }
        }
        
        currentY += 50;
      } else {
        // No images available
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('No documents available for this version', 22, currentY);
        currentY += 20;
      }
      
      // Add clean separator between versions
      if (i < processedData.length - 1) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;
      }
    }
    
    // Add footer
    addPDFFooter(doc);
    
    // Save the PDF
    const fileName = `application-history-${fullName?.replace(/\s+/g, '_') || 'unknown'}-${Date.now()}.pdf`;
    doc.save(fileName);
    
    console.log('History PDF export completed');
  } catch (error) {
    console.error('Error exporting history:', error);
    alert('Failed to export application history. Please try again.');
  }
};

// Export audit trail PDF
export const exportAuditTrailPDF = (auditLogs, fullName, email) => {
  console.log('Export audit trail clicked', { auditLogs, auditLogsLength: auditLogs?.length });
  
  if (!auditLogs || auditLogs.length === 0) {
    console.log('No audit logs data available');
    alert('No audit trail data available to export');
    return;
  }
  
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: 'Audit Trail Report',
      subject: `Audit trail for ${fullName || 'Unknown'}`,
      author: 'AI.ttorney Admin Panel',
      creator: 'AI.ttorney Admin Panel'
    });
    
    // Add header
    addPDFHeader(doc, 'AUDIT TRAIL', Date.now().toString().slice(-6));
    
    // Add applicant information
    let yPos = addApplicantInfo(doc, fullName, email, auditLogs.length);
    
    // Prepare table data
    const tableHeaders = ['Action', 'Admin', 'Role', 'Date'];
    
    const tableData = auditLogs.map((log) => {
      // Parse metadata for detailed action description
      let detailedAction = log.action;
      try {
        const metadata = typeof log.details === 'string' ? JSON.parse(log.details) : (log.metadata || {});
        if (metadata.old_status && metadata.new_status) {
          const version = metadata.version ? ` (V${metadata.version})` : '';
          detailedAction = `Changed status from ${capitalizeFirst(metadata.old_status)} to ${capitalizeFirst(metadata.new_status)}${version}`;
        }
      } catch {
        // Ignore parsing errors, use original action
      }
      
      return [
        detailedAction.substring(0, 70) + (detailedAction.length > 70 ? '...' : ''),
        log.actor_full_name || log.actor_name || 'Unknown Admin',
        capitalizeFirst(log.role || 'Admin'),
        formatDate(log.created_at, false)
      ];
    });
    
    // Add clean professional table with proper sizing
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 75, halign: 'left' }, // Action
        1: { cellWidth: 35, halign: 'left' }, // Admin
        2: { cellWidth: 25, halign: 'center' }, // Role
        3: { cellWidth: 35, halign: 'center' } // Date
      },
      margin: { left: 15, right: 15 },
      tableWidth: 170,
      theme: 'grid'
    });
    
    // Add footer
    addPDFFooter(doc);
    
    // Save the PDF
    const fileName = `audit-trail-${fullName?.replace(/\s+/g, '_') || 'unknown'}-${Date.now()}.pdf`;
    doc.save(fileName);
    
    console.log('Audit trail PDF export completed');
  } catch (error) {
    console.error('Error exporting audit trail:', error);
    alert('Failed to export audit trail. Please try again.');
  }
};
