import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';
import logoImage from '../../assets/images/logo.png';

// Helper function to log audit trail for PDF generation
const logPDFGeneration = async (applicationId, reportType, adminInfo, reportNumber = null) => {
  if (!applicationId || !adminInfo) {
    console.warn('Missing required data for audit logging:', { applicationId: !!applicationId, adminInfo: !!adminInfo });
    return;
  }
  
  try {
    // Create presentable action name
    const reportTypeDisplay = reportType === 'application_history' ? 'Application History' : 'Audit Trail';
    const presentableAction = `Generated ${reportTypeDisplay} Report #${reportNumber}`;
    
    const auditData = {
      application_id: applicationId,
      action: presentableAction,
      metadata: {
        report_type: reportType,
        report_number: reportNumber,
        generated_by: adminInfo.full_name || adminInfo.name || 'Unknown Admin',
        admin_role: adminInfo.role || 'Unknown Role',
        timestamp: new Date().toISOString(),
        original_action: `PDF_EXPORT_${reportType.toUpperCase()}` // Keep original for filtering if needed
      }
    };
    
    // Call the audit logging service
    await lawyerApplicationsService.createAuditLog(auditData);
  } catch (error) {
    console.error('Failed to log PDF generation audit:', error);
  }
};

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
  
  return null;
};

// Add professional PDF header
const addPDFHeader = async (doc, title, reportNumber, generatedBy = null) => {
  // Add professional header with white background (landscape: 297mm x 210mm)
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 15, 267, 25, 'F');
  
  // Load and add logo beside company name
  try {
    if (logoImage) {
      // Use the imported logo image
      doc.addImage(logoImage, 'PNG', 20, 20, 15, 15);
    } else {
      console.warn('Logo import failed, trying fallback paths');
      
      // Fallback to fetch method
      const logoPaths = [
        '/admin/src/assets/images/logo.png',
        './admin/src/assets/images/logo.png',
        '../assets/images/logo.png',
        '/assets/images/logo.png'
      ];
      
      let logoLoaded = false;
      
      for (const logoPath of logoPaths) {
        try {
          const response = await fetch(logoPath);
          if (response.ok) {
            const blob = await response.blob();
            const logoBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            
            // Add logo to PDF
            doc.addImage(logoBase64, 'PNG', 20, 20, 15, 15);
            logoLoaded = true;
            console.log('Logo loaded successfully from fallback:', logoPath);
            break;
          }
        } catch (pathError) {
          console.warn(`Failed to load logo from ${logoPath}:`, pathError);
          continue;
        }
      }
      
      if (!logoLoaded) {
        console.warn('Logo not found in any of the expected paths');
      }
    }
  } catch (error) {
    console.warn('Logo loading failed, continuing without logo:', error);
  }
  
  // Company name/logo area (moved right to accommodate logo)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Ai.ttorney', 40, 30);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Justice at Your Fingertips', 40, 35);
  
  // Document title on the right (adjusted for landscape)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 200, 28);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report #${reportNumber}`, 200, 33);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 37);
  
  // Add generated by information if available
  if (generatedBy) {
    doc.text(`Generated by: ${generatedBy}`, 200, 41);
  }
};

// Add applicant information section
const addApplicantInfo = (doc, fullName, email, totalRecords, yPos = 48) => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('APPLICANT INFORMATION', 20, yPos);
  
  // Draw line under header (adjusted for landscape)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, yPos + 2, 277, yPos + 2);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Left column
  doc.text('Name:', 20, yPos);
  doc.text(fullName || 'Unknown', 45, yPos);
  
  doc.text('Email:', 20, yPos + 6);
  doc.text(email || 'Unknown', 45, yPos + 6);
  
  // Right column (adjusted for landscape)
  doc.text('Generated:', 180, yPos);
  doc.text(new Date().toLocaleString(), 205, yPos);
  
  doc.text('Total Records:', 180, yPos + 6);
  doc.text(totalRecords.toString(), 205, yPos + 6);
  
  return yPos + 10;
};

// Add footer to all pages
const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    // Footer line (adjusted for landscape)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(20, 200, 277, 200);
    
    // Footer text (adjusted for landscape)
    doc.text('Ai.ttorney', 20, 205);
    doc.text(`Page ${i} of ${pageCount}`, 250, 205);
  }
};

// Export application history PDF
export const exportApplicationHistoryPDF = async (history, fullName, email, application, adminInfo = null) => {
  
  if (!history || history.length === 0) {
    console.log('No history data available');
    alert('No application history data available to export');
    return;
  }
  
  try {
    // Create a new PDF document in landscape orientation
    const doc = new jsPDF('landscape');
    
    // Set document properties
    doc.setProperties({
      title: 'Application History Report',
      subject: `Application history for ${fullName || 'Unknown'}`,
      author: 'AI.ttorney Admin Panel',
      creator: 'AI.ttorney Admin Panel'
    });
    
    // Add header
    const reportNumber = Date.now().toString().slice(-6);
    const generatedBy = adminInfo ? `${adminInfo.full_name || adminInfo.name || 'Unknown Admin'} (${adminInfo.role || 'Unknown Role'})` : null;
    await addPDFHeader(doc, 'APPLICATION HISTORY', reportNumber, generatedBy);
    
    // Add applicant information
    let yPos = addApplicantInfo(doc, fullName, email, history.length);
    
    // Prepare comprehensive table data with version column
    const tableHeaders = [
      'Version', 'Full Name', 'Roll Number', 'Status', 'Roll Sign Date',
      'Reviewed By', 'Reviewed At', 'Admin Notes', 'Submitted At'
    ];
    
    // Process all applications - only load images for the current version to improve performance
    const processedData = [];
    
    for (let i = 0; i < history.length; i++) {
      const app = history[i];
      const version = app.version || (history.length - i);
      
      // Only load images for the current version (first item) to improve performance
      let ibpImage = null;
      let selfieImage = null;
      let ibpPath = null;
      let selfiePath = null;
      
      if (i === 0) { // Only process images for current version
        ibpPath = app.ibp_id || app.ibp_card_path || app.ibp_card || application?.ibp_id || application?.ibp_card_path || application?.ibp_card;
        selfiePath = app.selfie || app.selfie_path || app.live_selfie || application?.selfie || application?.selfie_path || application?.live_selfie;
        
        console.log('Processing version', version, ':', { ibpPath, selfiePath });
        
        // Load images only for current version
        if (ibpPath) ibpImage = await loadImageAsBase64(ibpPath, 'ibp-ids');
        if (selfiePath) selfieImage = await loadImageAsBase64(selfiePath, 'selfie-ids');
      }
      
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
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'left', fontStyle: 'bold' }, // Version
        1: { cellWidth: 35, halign: 'left' }, // Full Name
        2: { cellWidth: 25, halign: 'left' }, // Roll Number
        3: { cellWidth: 22, halign: 'left' }, // Status
        4: { cellWidth: 25, halign: 'left' }, // Roll Signing Date
        5: { cellWidth: 30, halign: 'left' }, // Reviewed By
        6: { cellWidth: 25, halign: 'left' }, // Reviewed At
        7: { cellWidth: 50, halign: 'left' }, // Admin Notes
        8: { cellWidth: 25, halign: 'left' } // Submitted At
      },
      margin: { left: 20, right: 20 },
      tableWidth: 257,
      theme: 'grid'
    });
    
    // Add documents section after the main table
    let currentY = doc.lastAutoTable.finalY + 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('APPLICATION DOCUMENTS', 20, currentY);
    
    // Draw line under header (adjusted for landscape)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, currentY + 2, 277, currentY + 2);
    currentY += 8;
    
    // Create documents table only for the current/latest version (first in array)
    if (processedData.length > 0) {
      const { version, images } = processedData[0]; // Only show current version documents
      const { ibpImage, selfieImage } = images;
      
      // Check if we need a new page (adjusted for landscape - height is 210mm, so usable space is ~160)
      let needsNewPage = currentY > 160;
      if (needsNewPage) {
        doc.addPage();
        currentY = 30;
      }
      
      // Version header (only add once)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Version ${version}`, 20, currentY);
      currentY += 5;
      
      // Create table structure for documents
      const tableData = [['', '']]; // Single row for images
      
      // Optimized table with smaller height for faster rendering
      const requiredHeight = ibpImage || selfieImage ? 50 : 30; // Reduced height for performance
      
      // Add table with optimized settings for performance
      autoTable(doc, {
        body: tableData,
        startY: currentY,
        columnStyles: {
          0: { cellWidth: 128.5, halign: 'center' },
          1: { cellWidth: 128.5, halign: 'center' }
        },
        styles: {
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          minCellHeight: requiredHeight,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 1, bottom: 1, left: 2, right: 2 },
          minCellHeight: 6,
          lineColor: [0, 0, 0],
          lineWidth: 0.5
        },
        head: [['IBP CARD', 'LIVE SELFIE']],
        margin: { left: 20, right: 20 },
        tableWidth: 257,
        theme: 'grid',
        showHead: 'everyPage',
        pageBreak: 'avoid',
        didDrawCell: function(data) {
          // Only draw images in body cells (not header)
          if (data.section === 'body') {
            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;
            
            // Calculate available space with padding
            const maxWidth = cellWidth - 4;
            const maxHeight = cellHeight - 4;
            
            // Add images to cells with optimized rendering for performance
            if (data.column.index === 0 && ibpImage) {
              // IBP Card image - optimized for speed
              try {
                // Use fixed dimensions for faster rendering
                const imageWidth = Math.min(maxWidth * 0.9, 80); // Max 80 units wide
                const imageHeight = Math.min(maxHeight * 0.9, 45); // Max 45 units tall
                
                // Center the image in the cell
                const offsetX = (maxWidth - imageWidth) / 2;
                const offsetY = (maxHeight - imageHeight) / 2;
                
                // Add image with fixed dimensions for consistent performance
                doc.addImage(ibpImage, 'JPEG', cellX + 2 + offsetX, cellY + 2 + offsetY, imageWidth, imageHeight);
              } catch (imgError) {
                console.warn('Failed to add IBP image:', imgError);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Image failed to load', cellX + cellWidth/2, cellY + cellHeight/2, { align: 'center' });
              }
            } else if (data.column.index === 0 && !ibpImage) {
              // No IBP image placeholder
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.text('[IMAGE]', cellX + cellWidth/2, cellY + cellHeight/2, { align: 'center' });
            }
            
            if (data.column.index === 1 && selfieImage) {
              // Selfie image - optimized for speed
              try {
                // Use fixed dimensions for faster rendering
                const imageWidth = Math.min(maxWidth * 0.9, 80); // Max 80 units wide
                const imageHeight = Math.min(maxHeight * 0.9, 45); // Max 45 units tall
                
                // Center the image in the cell
                const offsetX = (maxWidth - imageWidth) / 2;
                const offsetY = (maxHeight - imageHeight) / 2;
                
                // Add image with fixed dimensions for consistent performance
                doc.addImage(selfieImage, 'JPEG', cellX + 2 + offsetX, cellY + 2 + offsetY, imageWidth, imageHeight);
              } catch (imgError) {
                console.warn('Failed to add selfie image:', imgError);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Image failed to load', cellX + cellWidth/2, cellY + cellHeight/2, { align: 'center' });
              }
            } else if (data.column.index === 1 && !selfieImage) {
              // No selfie image placeholder
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.text('[IMAGE]', cellX + cellWidth/2, cellY + cellHeight/2, { align: 'center' });
            }
          }
        },
        // Allow table to expand based on content
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.5
      });
      
      currentY = doc.lastAutoTable.finalY + 15;
    } else {
      // No documents available
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('No documents available', 20, currentY + 20);
    }
    
    // Add footer
    addPDFFooter(doc);
    
    // Save the PDF
    const fileName = `Application_History_${fullName?.replace(/\s+/g, '_') || 'Unknown'}_${reportNumber}.pdf`;
    doc.save(fileName);
    
    // Log PDF generation in audit trail
    const applicationId = application?.id || application?.data?.id || application;
    console.log('Application History PDF - Debug application ID:', { application, applicationId });
    
    if (applicationId) {
      // Ensure we have admin info, even if it's minimal
      const auditAdminInfo = adminInfo || { 
        full_name: 'Unknown Admin', 
        name: 'Unknown Admin', 
        role: 'Unknown Role' 
      };
      await logPDFGeneration(applicationId, 'application_history', auditAdminInfo, reportNumber);
    } else {
      console.warn('Application History PDF - No application ID found for audit logging');
    }
    
  } catch (error) {
    console.error('Error exporting history:', error);
    alert('Failed to export application history. Please try again.');
  }
};

// Export audit trail PDF
export const exportAuditTrailPDF = async (auditLogs, fullName, email, adminInfo = null, applicationId = null) => {
  
  if (!auditLogs || auditLogs.length === 0) {
    console.log('No audit logs data available');
    alert('No audit trail data available to export');
    return;
  }
  
  try {
    // Create a new PDF document in landscape orientation
    const doc = new jsPDF('landscape');
    
    // Set document properties
    doc.setProperties({
      title: 'Audit Trail Report',
      subject: `Audit trail for ${fullName || 'Unknown'}`,
      author: 'AI.ttorney Admin Panel',
      creator: 'AI.ttorney Admin Panel'
    });
    
    // Add header
    const reportNumber = Date.now().toString().slice(-6);
    const generatedBy = adminInfo ? `${adminInfo.full_name || adminInfo.name || 'Unknown Admin'} (${adminInfo.role || 'Unknown Role'})` : null;
    await addPDFHeader(doc, 'AUDIT TRAIL', reportNumber, generatedBy);
    
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
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 118, halign: 'left' }, // Action
        1: { cellWidth: 48, halign: 'left' }, // Admin
        2: { cellWidth: 38, halign: 'left' }, // Role
        3: { cellWidth: 43, halign: 'left' } // Date
      },
      margin: { left: 20, right: 20 },
      tableWidth: 247,
      theme: 'grid'
    });
    
    // Add footer
    addPDFFooter(doc);
    
    // Save the PDF
    const fileName = `Audit_Trail_${fullName?.replace(/\s+/g, '_') || 'Unknown'}_${reportNumber}.pdf`;
    doc.save(fileName);
    
    // Log PDF generation in audit trail
    if (applicationId) {
      // Ensure we have admin info, even if it's minimal
      const auditAdminInfo = adminInfo || { 
        full_name: 'Unknown Admin', 
        name: 'Unknown Admin', 
        role: 'Unknown Role' 
      };
      await logPDFGeneration(applicationId, 'audit_trail', auditAdminInfo, reportNumber);
    }
    
  } catch (error) {
    console.error('Error exporting audit trail:', error);
    alert('Failed to export audit trail. Please try again.');
  }
};
