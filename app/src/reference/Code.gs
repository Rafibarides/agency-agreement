// ============================================
// PROPERTY AGREEMENT FORM - GOOGLE APPS SCRIPT
// ============================================

// Configuration
const CONFIG = {
  ADMIN_USERNAME: 'Admin',
  ADMIN_PASSWORD: 'wellbound!',
  SHEET_NAME: 'Agreements',
  COMPANY_INFO: {
    name: 'AMBER COURT AT HOME D/B/A WELLBOUND',
    address: '7424 13th Avenue',
    city: 'Brooklyn, NY 11228',
    phone: 'Tel: 718-530-9880'
  }
};

// ============================================
// WEB APP ENTRY POINTS
// ============================================

function doGet(e) {
  const page = e.parameter.page || 'form';
  
  if (page === 'admin') {
    return HtmlService.createHtmlOutput(getAdminLoginPage())
      .setTitle('Admin Login')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  return HtmlService.createHtmlOutput(getFormPage())
    .setTitle('Property Agreement Form')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      case 'submitForm':
        return ContentService.createTextOutput(JSON.stringify(submitAgreement(data)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'login':
        return ContentService.createTextOutput(JSON.stringify(adminLogin(data)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getAgreements':
        return ContentService.createTextOutput(JSON.stringify(getAllAgreements()))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'searchAgreements':
        return ContentService.createTextOutput(JSON.stringify(searchAgreements(data.query)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getStats':
        return ContentService.createTextOutput(JSON.stringify(getStatistics()))
          .setMimeType(ContentService.MimeType.JSON);
      
      default:
        throw new Error('Invalid action');
    }
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// SPREADSHEET FUNCTIONS
// ============================================

function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    
    // Set up headers
    const headers = [
      'Timestamp',
      'Name',
      'Title',
      'Worker ID',
      'Has Different Training ID',
      'Training Worker ID',
      'Device',
      'Device Name',
      'Portable Charger',
      'Protective Cover',
      'Keyboard/Accessory',
      'Serial Number',
      'Esper Identifier Code',
      'Exchange Device',
      'Returning Device Name',
      'Returning Serial Number',
      'Agreement 1',
      'Agreement 2',
      'Agreement 3',
      'Employee Signature Date',
      'Employee Signature',
      'Supervisor Signature Date',
      'Supervisor Signature'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function submitAgreement(data) {
  try {
    const sheet = initializeSpreadsheet();
    
    const row = [
      new Date(),
      data.name || '',
      data.title || '',
      data.workerId || '',
      data.hasDifferentTrainingId || false,
      data.trainingWorkerId || data.workerId || '',
      data.device || false,
      data.deviceName || '',
      data.portableCharger || false,
      data.protectiveCover || false,
      data.keyboard || false,
      data.serialNumber || '',
      data.esperIdentifier || '',
      data.exchangeDevice || false,
      data.returningDeviceName || '',
      data.returningSerial || '',
      data.agreement1 || false,
      data.agreement2 || false,
      data.agreement3 || false,
      data.employeeSignatureDate || new Date(),
      data.employeeSignature || '',
      data.supervisorSignatureDate || new Date(),
      data.supervisorSignature || ''
    ];
    
    sheet.appendRow(row);
    
    return {
      success: true,
      message: 'Agreement submitted successfully',
      rowNumber: sheet.getLastRow()
    };
  } catch(error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getAllAgreements() {
  try {
    const sheet = initializeSpreadsheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, agreements: [] };
    }
    
    const headers = data[0];
    const agreements = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const agreement = {};
      
      headers.forEach((header, index) => {
        agreement[header] = row[index];
      });
      
      agreement.rowNumber = i + 1;
      agreements.push(agreement);
    }
    
    return {
      success: true,
      agreements: agreements.reverse() // Most recent first
    };
  } catch(error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function searchAgreements(query) {
  try {
    const allData = getAllAgreements();
    
    if (!allData.success) {
      return allData;
    }
    
    const searchTerm = query.toLowerCase();
    const filtered = allData.agreements.filter(agreement => {
      return (
        (agreement.Name && agreement.Name.toString().toLowerCase().includes(searchTerm)) ||
        (agreement['Worker ID'] && agreement['Worker ID'].toString().toLowerCase().includes(searchTerm)) ||
        (agreement['Serial Number'] && agreement['Serial Number'].toString().toLowerCase().includes(searchTerm)) ||
        (agreement['Esper Identifier Code'] && agreement['Esper Identifier Code'].toString().toLowerCase().includes(searchTerm))
      );
    });
    
    return {
      success: true,
      agreements: filtered
    };
  } catch(error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getStatistics() {
  try {
    const allData = getAllAgreements();
    
    if (!allData.success) {
      return allData;
    }
    
    const agreements = allData.agreements;
    
    // Count Esper IDs (non-empty)
    const esperIds = agreements.filter(a => 
      a['Esper Identifier Code'] && a['Esper Identifier Code'].toString().trim() !== ''
    ).length;
    
    return {
      success: true,
      stats: {
        totalAgreements: agreements.length,
        esperIds: esperIds,
        lastSubmission: agreements.length > 0 ? agreements[0].Timestamp : null
      }
    };
  } catch(error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// AUTHENTICATION
// ============================================

function adminLogin(data) {
  const username = data.username;
  const password = data.password;
  
  if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
    return {
      success: true,
      message: 'Login successful'
    };
  }
  
  return {
    success: false,
    error: 'Invalid credentials'
  };
}

// ============================================
// PDF GENERATION
// ============================================

function generatePDF(rowNumber) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    const data = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const agreement = {};
    headers.forEach((header, index) => {
      agreement[header] = data[index];
    });
    
    // Create HTML for PDF
    const html = generatePDFHTML(agreement);
    
    // Convert to PDF
    const blob = Utilities.newBlob(html, 'text/html', 'agreement.html').getAs('application/pdf');
    
    return {
      success: true,
      pdf: Utilities.base64Encode(blob.getBytes()),
      filename: `Agreement_${agreement.Name}_${agreement['Worker ID']}.pdf`
    };
  } catch(error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function generatePDFHTML(agreement) {
  const devicesList = [];
  if (agreement.Device) devicesList.push(agreement['Device Name'] || 'Device');
  if (agreement['Portable Charger']) devicesList.push('Portable Charger');
  if (agreement['Protective Cover']) devicesList.push('Protective Cover');
  if (agreement['Keyboard/Accessory']) devicesList.push('Keyboard/Accessory');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #3E0E30;
          padding-bottom: 20px;
        }
        .company-info {
          text-align: center;
          font-size: 12px;
          margin-top: 10px;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0;
          color: #3E0E30;
        }
        .field {
          margin: 15px 0;
        }
        .field-label {
          font-weight: bold;
          color: #3E0E30;
        }
        .signature-section {
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .signature-box {
          margin: 20px 0;
          padding: 10px;
          border: 1px solid #ccc;
        }
        .signature-image {
          min-height: 60px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PROPERTY AGREEMENT FORM</h1>
        <div class="company-info">
          <div>${CONFIG.COMPANY_INFO.name}</div>
          <div>${CONFIG.COMPANY_INFO.address}</div>
          <div>${CONFIG.COMPANY_INFO.city}</div>
          <div>${CONFIG.COMPANY_INFO.phone}</div>
        </div>
      </div>
      
      <div class="field">
        <span class="field-label">Name:</span> ${agreement.Name || ''}
      </div>
      
      <div class="field">
        <span class="field-label">Title:</span> ${agreement.Title || ''}
      </div>
      
      <div class="field">
        <span class="field-label">Worker ID:</span> ${agreement['Worker ID'] || ''}
      </div>
      
      ${agreement['Has Different Training ID'] ? `
      <div class="field">
        <span class="field-label">Training Worker ID:</span> ${agreement['Training Worker ID'] || ''}
      </div>
      ` : ''}
      
      <div class="title">Acknowledgement of Received Property</div>
      
      <div class="field">
        <span class="field-label">Devices Received:</span>
        <ul>
          ${devicesList.map(device => `<li>${device}</li>`).join('')}
        </ul>
      </div>
      
      ${agreement['Serial Number'] ? `
      <div class="field">
        <span class="field-label">Serial Number:</span> ${agreement['Serial Number']}
      </div>
      ` : ''}
      
      ${agreement['Esper Identifier Code'] ? `
      <div class="field">
        <span class="field-label">Esper Identifier Code:</span> ${agreement['Esper Identifier Code']}
      </div>
      ` : ''}
      
      ${agreement['Exchange Device'] ? `
      <div class="field">
        <span class="field-label">Exchange Information:</span>
        <div>Returning Device: ${agreement['Returning Device Name'] || ''}</div>
        <div>Returning Serial: ${agreement['Returning Serial Number'] || ''}</div>
      </div>
      ` : ''}
      
      <div class="title">Agreements</div>
      
      <div class="field">
        ☑ I agree to maintain all Agency property in working condition, and to notify the Agency in the event that the property malfunctions in any way, or if the property is lost or stolen.
      </div>
      
      <div class="field">
        ☑ If there are any items which I do not need, these will be returned immediately to my Supervisor.
      </div>
      
      <div class="field">
        ☑ I have been advised by my Supervisor / Human Resources, that it is my responsibility to return all property to the Agency upon termination of the engagement between myself and the Agency.
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div><strong>Employee Signature</strong></div>
          <div class="signature-image">
            ${agreement['Employee Signature'] ? `<img src="${svgToDataUrl(agreement['Employee Signature'])}" style="max-height: 60px;" />` : ''}
          </div>
          <div>Date: ${formatDate(agreement['Employee Signature Date'])}</div>
        </div>
        
        <div class="signature-box">
          <div><strong>Supervisor Signature</strong></div>
          <div class="signature-image">
            ${agreement['Supervisor Signature'] ? `<img src="${svgToDataUrl(agreement['Supervisor Signature'])}" style="max-height: 60px;" />` : ''}
          </div>
          <div>Date: ${formatDate(agreement['Supervisor Signature Date'])}</div>
        </div>
      </div>
      
      <div class="footer">
        Generated on ${formatDate(new Date())}
      </div>
    </body>
    </html>
  `;
}

function svgToDataUrl(svgPath) {
  if (!svgPath || svgPath.trim() === '') return '';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100">
    <path d="${svgPath}" stroke="#000" stroke-width="2" fill="none" />
  </svg>`;
  
  return 'data:image/svg+xml;base64,' + Utilities.base64Encode(svg);
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// ============================================
// HTML TEMPLATES (Placeholder - Frontend to be built)
// ============================================

function getFormPage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Property Agreement Form</title>
      <style>
        body { font-family: Arial; padding: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Property Agreement Form</h1>
      <p>This is a placeholder. Build your frontend to connect to this endpoint.</p>
      <p>Web App URL: ${ScriptApp.getService().getUrl()}</p>
      <p>Use POST requests with action parameter to interact with the backend.</p>
    </body>
    </html>
  `;
}

function getAdminLoginPage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login</title>
      <style>
        body { font-family: Arial; padding: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Admin Portal</h1>
      <p>This is a placeholder. Build your admin frontend to connect to this endpoint.</p>
      <p>Web App URL: ${ScriptApp.getService().getUrl()}</p>
    </body>
    </html>
  `;
}

// ============================================
// UTILITY FUNCTIONS FOR TESTING
// ============================================

function testSubmit() {
  const testData = {
    action: 'submitForm',
    name: 'John Doe',
    title: 'RN – Registered Nurse',
    workerId: '12345',
    hasDifferentTrainingId: false,
    trainingWorkerId: '12345',
    device: true,
    deviceName: 'Lenovo Tab',
    portableCharger: true,
    protectiveCover: true,
    keyboard: false,
    serialNumber: 'SN123456',
    esperIdentifier: 'ESP789',
    exchangeDevice: false,
    agreement1: true,
    agreement2: true,
    agreement3: true,
    employeeSignatureDate: new Date(),
    employeeSignature: 'M 10 50 L 100 50',
    supervisorSignatureDate: new Date(),
    supervisorSignature: 'M 10 50 L 100 50'
  };
  
  Logger.log(submitAgreement(testData));
}

function testGetAgreements() {
  Logger.log(getAllAgreements());
}

function testSearch() {
  Logger.log(searchAgreements('john'));
}

function testStats() {
  Logger.log(getStatistics());
}