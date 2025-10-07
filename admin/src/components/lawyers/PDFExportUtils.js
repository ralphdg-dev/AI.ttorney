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
    
    // Process all applications with optimized parallel image loading
    const processedData = [];
    
    // First pass: collect all image paths and prepare data structure
    const imageLoadPromises = [];
    const versionData = [];
    
    for (let i = 0; i < history.length; i++) {
      const app = history[i];
      const version = app.version || (history.length - i);
      
      // Collect image paths
      let ibpPath = app.ibp_id || app.ibp_card_path || app.ibp_card;
      let selfiePath = app.selfie || app.selfie_path || app.live_selfie;
      
      // If this is the current version (index 0), try to get paths from the main application data as fallback
      if (i === 0 && (!ibpPath || !selfiePath)) {
        ibpPath = ibpPath || application?.ibp_id || application?.ibp_card_path || application?.ibp_card;
        selfiePath = selfiePath || application?.selfie || application?.selfie_path || application?.live_selfie;
      }
      
      // Store version data
      versionData.push({
        app,
        version,
        ibpPath,
        selfiePath,
        index: i
      });
      
      // Add image loading promises (parallel loading)
      if (ibpPath) {
        imageLoadPromises.push(
          loadImageAsBase64(ibpPath, 'ibp-ids').then(img => ({ type: 'ibp', version, img })).catch(() => ({ type: 'ibp', version, img: null }))
        );
      }
      if (selfiePath) {
        imageLoadPromises.push(
          loadImageAsBase64(selfiePath, 'selfie-ids').then(img => ({ type: 'selfie', version, img })).catch(() => ({ type: 'selfie', version, img: null }))
        );
      }
    }
    
    // Load all images in parallel
    const imageResults = await Promise.all(imageLoadPromises);
    
    // Create image lookup map for fast access
    const imageMap = new Map();
    imageResults.forEach(result => {
      const key = `${result.version}_${result.type}`;
      imageMap.set(key, result.img);
    });
    
    // Second pass: build processed data with loaded images
    for (const versionInfo of versionData) {
      const { app, version, ibpPath, selfiePath } = versionInfo;
      
      const ibpImage = ibpPath ? imageMap.get(`${version}_ibp`) || null : null;
      const selfieImage = selfiePath ? imageMap.get(`${version}_selfie`) || null : null;
      
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
    
    // Create optimized documents tables for ALL versions
    const tableConfig = {
      columnStyles: {
        0: { cellWidth: 128.5, halign: 'center' },
        1: { cellWidth: 128.5, halign: 'center' }
      },
      styles: {
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        minCellHeight: 45, // Fixed height for consistency
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
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.5
    };

    for (let i = 0; i < processedData.length; i++) {
      const { version, images } = processedData[i];
      const { ibpImage, selfieImage } = images;
      
      // Skip versions with no images to improve performance
      if (!ibpImage && !selfieImage) {
        continue;
      }
      
      // Check if we need a new page
      let needsNewPage = currentY > 160;
      if (needsNewPage) {
        doc.addPage();
        currentY = 30;
      }
      
      // Version header
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Version ${version}`, 20, currentY);
      currentY += 5;
      
      // Create table with pre-configured settings
      autoTable(doc, {
        ...tableConfig,
        body: [['', '']],
        startY: currentY,
        didDrawCell: function(data) {
          if (data.section === 'body') {
            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;
            
            // Fixed dimensions for consistent performance
            const imageWidth = 75;
            const imageHeight = 40;
            const offsetX = (cellWidth - imageWidth) / 2;
            const offsetY = (cellHeight - imageHeight) / 2;
            
            try {
              if (data.column.index === 0 && ibpImage) {
                doc.addImage(ibpImage, 'JPEG', cellX + offsetX, cellY + offsetY, imageWidth, imageHeight);
              } else if (data.column.index === 1 && selfieImage) {
                doc.addImage(selfieImage, 'JPEG', cellX + offsetX, cellY + offsetY, imageWidth, imageHeight);
              } else {
                // Placeholder for missing images
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('[NO IMAGE]', cellX + cellWidth/2, cellY + cellHeight/2, { align: 'center' });
              }
            } catch (imgError) {
              // Error placeholder
              doc.setFontSize(7);
              doc.setTextColor(200, 100, 100);
              doc.text('[ERROR]', cellX + cellWidth/2, cellY + cellHeight/2, { align: 'center' });
            }
          }
        }
      });
      
      currentY = doc.lastAutoTable.finalY + 10; // Reduced spacing
    }
    
    // Handle case when no processed data is available
    if (processedData.length === 0) {
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
