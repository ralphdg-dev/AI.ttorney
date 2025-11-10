import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../../assets/images/logo.png";

// Helper function to log audit trail for PDF generation
const logPDFGeneration = async (
  articleId,
  reportType,
  adminInfo,
  articleTitle,
  reportNumber = null
) => {
  if (!articleId || !adminInfo) {
    console.warn("Missing required data for audit logging:", {
      articleId: !!articleId,
      adminInfo: !!adminInfo,
    });
    return;
  }

  try {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      console.warn("No admin token found for audit logging");
      return;
    }

    // Create presentable action name
    const reportTypeDisplay =
      reportType === "article_audit"
        ? "Article Audit Trail"
        : "Article Activity Report";
    const presentableAction = `Generated ${reportTypeDisplay} Report #${reportNumber}`;

    const auditData = {
      action: presentableAction,
      target_table: "legal_articles",
      target_id: articleId,
      metadata: {
        report_type: reportType,
        report_number: reportNumber,
        article_title: articleTitle,
        generated_by: adminInfo.full_name || adminInfo.name || "Unknown Admin",
        admin_role: adminInfo.role || "Unknown Role",
        timestamp: new Date().toISOString(),
      },
    };

    // Call the audit logging endpoint
    console.log(
      `Logging PDF generation: ${presentableAction} for article ${articleId}`
    );

    const response = await fetch(
      "http://localhost:5001/api/legal-articles/audit-log",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(auditData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to log PDF generation: ${response.statusText}`);
    }

    console.log(
      `Successfully logged PDF generation audit for article ${articleId}`
    );
  } catch (error) {
    console.error("Failed to log PDF generation audit:", error);
    // Still continue with PDF generation even if audit logging fails
  }
};

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper function to format dates
const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return "-";
  const date = new Date(dateString);

  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleDateString("en-US", options);
};

// Add professional PDF header
const addPDFHeader = async (doc, title, reportNumber, generatedBy = null) => {
  // Add professional header with white background (landscape: 297mm x 210mm)
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 15, 267, 25, "F");

  // Load and add logo beside company name
  try {
    if (logoImage) {
      doc.addImage(logoImage, "PNG", 20, 20, 15, 15);
    } else {
      console.warn("Logo import failed, trying fallback paths");

      const logoPaths = [
        "/admin/src/assets/images/logo.png",
        "./admin/src/assets/images/logo.png",
        "../assets/images/logo.png",
        "/assets/images/logo.png",
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

            doc.addImage(logoBase64, "PNG", 20, 20, 15, 15);
            logoLoaded = true;
            console.log("Logo loaded successfully from fallback:", logoPath);
            break;
          }
        } catch (pathError) {
          console.warn(`Failed to load logo from ${logoPath}:`, pathError);
          continue;
        }
      }

      if (!logoLoaded) {
        console.warn("Logo not found in any of the expected paths");
      }
    }
  } catch (error) {
    console.warn("Logo loading failed, continuing without logo:", error);
  }

  // Company name/logo area
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Ai.ttorney", 40, 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Justice at Your Fingertips", 40, 35);

  // Document title on the right
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, 200, 28);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Report #${reportNumber}`, 200, 33);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 37);

  if (generatedBy) {
    doc.text(`Generated by: ${generatedBy}`, 200, 41);
  }
};

// Add article information section
const addArticleInfo = (
  doc,
  articleTitle,
  category,
  totalRecords,
  yPos = 48
) => {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE INFORMATION", 20, yPos);

  // Draw line under header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, yPos + 2, 277, yPos + 2);

  yPos += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Left column
  doc.text("Article Title:", 20, yPos);
  doc.text(articleTitle || "Unknown", 55, yPos);

  doc.text("Category:", 20, yPos + 6);
  doc.text(capitalizeFirst(category) || "Unknown", 55, yPos + 6);

  // Right column
  doc.text("Generated:", 180, yPos);
  doc.text(new Date().toLocaleString(), 205, yPos);

  doc.text("Total Records:", 180, yPos + 6);
  doc.text(totalRecords.toString(), 205, yPos + 6);

  return yPos + 10;
};

// Add footer to all pages
const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    // Footer line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(20, 200, 277, 200);

    // Footer text
    doc.text("Ai.ttorney", 20, 205);
    doc.text(`Page ${i} of ${pageCount}`, 250, 205);
  }
};

// Export article audit trail PDF
export const exportArticleAuditTrailPDF = async (
  auditLogs,
  articleTitle,
  category,
  adminInfo = null,
  articleId = null
) => {
  if (!auditLogs || auditLogs.length === 0) {
    console.log("No audit logs data available");
    alert("No audit trail data available to export");
    return;
  }

  try {
    // Create a new PDF document in landscape orientation
    const doc = new jsPDF("landscape");

    // Set document properties
    doc.setProperties({
      title: "Article Audit Trail Report",
      subject: `Article audit trail for ${articleTitle || "Unknown"}`,
      author: "AI.ttorney Admin Panel",
      creator: "AI.ttorney Admin Panel",
    });

    // Add header
    const reportNumber = Date.now().toString().slice(-6);
    const generatedBy = adminInfo
      ? `${adminInfo.full_name || adminInfo.name || "Unknown Admin"} (${
          adminInfo.role || "Unknown Role"
        })`
      : null;
    await addPDFHeader(doc, "ARTICLE AUDIT TRAIL", reportNumber, generatedBy);

    // Add article information
    let yPos = addArticleInfo(doc, articleTitle, category, auditLogs.length);

    // Prepare table data
    const tableHeaders = ["Action", "Admin", "Role", "Date", "Details"];

    const tableData = auditLogs.map((log) => {
      // Parse metadata for additional information
      let detailedAction = log.action;
      let details = "-";

      try {
        const parsedMetadata =
          typeof log.metadata === "string"
            ? JSON.parse(log.metadata)
            : log.metadata || {};
        if (parsedMetadata.action) {
          details = parsedMetadata.action;
        }
        if (parsedMetadata.previous_status && parsedMetadata.new_status) {
          detailedAction = `Changed status from ${capitalizeFirst(
            parsedMetadata.previous_status
          )} to ${capitalizeFirst(parsedMetadata.new_status)}`;
        }
        if (parsedMetadata.article_title) {
          details = `Article: ${parsedMetadata.article_title}`;
        }
      } catch {
        // Ignore parsing errors, use original action
      }

      // Get actor name from log, fallback to "Unknown Admin"
      const actorName = log.actor_name || "Unknown Admin";
      const actorRole = capitalizeFirst(log.role || "Admin");

      return [
        detailedAction.substring(0, 50) +
          (detailedAction.length > 50 ? "..." : ""),
        actorName,
        actorRole,
        formatDate(log.created_at, false),
        details.substring(0, 40) + (details.length > 40 ? "..." : ""),
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
        fontStyle: "normal",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 7,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 70, halign: "left" }, // Action
        1: { cellWidth: 45, halign: "left" }, // Admin
        2: { cellWidth: 35, halign: "left" }, // Role
        3: { cellWidth: 40, halign: "left" }, // Date
        4: { cellWidth: 67, halign: "left" }, // Details
      },
      margin: { left: 20, right: 20 },
      tableWidth: 257,
      theme: "grid",
    });

    // Add footer
    addPDFFooter(doc);

    // Save the PDF
    const fileName = `Article_Audit_Trail_${
      articleTitle?.replace(/\s+/g, "_") || "Unknown"
    }_${reportNumber}.pdf`;
    doc.save(fileName);

    // Log PDF generation in audit trail
    if (articleId && adminInfo) {
      console.log(`Article Audit Trail PDF generated: ${fileName}`);
      await logPDFGeneration(
        articleId,
        "article_audit",
        adminInfo,
        articleTitle,
        reportNumber
      );
    } else {
      console.warn(
        "Article Audit Trail PDF generated but missing articleId or adminInfo for audit logging"
      );
    }
  } catch (error) {
    console.error("Error exporting article audit trail:", error);
    alert("Failed to export article audit trail. Please try again.");
  }
};

// Export article activity report PDF
export const exportArticleActivityPDF = async (
  activityLogs,
  articleTitle,
  category,
  adminInfo = null,
  articleId = null
) => {
  if (!activityLogs || activityLogs.length === 0) {
    console.log("No activity logs data available");
    alert("No activity data available to export");
    return;
  }

  try {
    // Create a new PDF document in landscape orientation
    const doc = new jsPDF("landscape");

    // Set document properties
    doc.setProperties({
      title: "Article Activity Report",
      subject: `Article activity report for ${articleTitle || "Unknown"}`,
      author: "AI.ttorney Admin Panel",
      creator: "AI.ttorney Admin Panel",
    });

    // Add header
    const reportNumber = Date.now().toString().slice(-6);
    const generatedBy = adminInfo
      ? `${adminInfo.full_name || adminInfo.name || "Unknown Admin"} (${
          adminInfo.role || "Unknown Role"
        })`
      : null;
    await addPDFHeader(
      doc,
      "ARTICLE ACTIVITY REPORT",
      reportNumber,
      generatedBy
    );

    // Add article information
    let yPos = addArticleInfo(doc, articleTitle, category, activityLogs.length);

    // Prepare table data
    const tableHeaders = ["Action", "Date", "Details"];

    const tableData = activityLogs.map((activity) => {
      // Get details from activity
      let details = "-";
      try {
        const parsedMetadata =
          typeof activity.metadata === "string"
            ? JSON.parse(activity.metadata)
            : activity.metadata || {};

        if (parsedMetadata.action_type) {
          details = parsedMetadata.action_type;
        } else if (parsedMetadata.action) {
          details = parsedMetadata.action;
        }
      } catch {
        details = activity.action || "-";
      }

      return [
        activity.action || "Unknown Action",
        formatDate(activity.date || activity.created_at, true),
        details.substring(0, 80) + (details.length > 80 ? "..." : ""),
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
        fontStyle: "normal",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 7,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 85, halign: "left" }, // Action
        1: { cellWidth: 60, halign: "left" }, // Date
        2: { cellWidth: 112, halign: "left" }, // Details
      },
      margin: { left: 20, right: 20 },
      tableWidth: 257,
      theme: "grid",
    });

    // Add footer
    addPDFFooter(doc);

    // Save the PDF
    const fileName = `Article_Activity_Report_${
      articleTitle?.replace(/\s+/g, "_") || "Unknown"
    }_${reportNumber}.pdf`;
    doc.save(fileName);

    // Log PDF generation in audit trail
    if (articleId && adminInfo) {
      console.log(`Article Activity Report PDF generated: ${fileName}`);
      await logPDFGeneration(
        articleId,
        "article_activity",
        adminInfo,
        articleTitle,
        reportNumber
      );
    } else {
      console.warn(
        "Article Activity Report PDF generated but missing articleId or adminInfo for audit logging"
      );
    }
  } catch (error) {
    console.error("Error exporting article activity report:", error);
    alert("Failed to export article activity report. Please try again.");
  }
};
