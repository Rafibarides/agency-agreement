import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPhone,
  faSpinner,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { getCellularDeviceReport, isEsperConfigured } from '../utils/esperApi';

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(rows, headers, filename) {
  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PhoneNumberReport = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!isEsperConfigured()) {
      alert('Esper API is not configured.');
      return;
    }

    setLoading(true);
    try {
      const data = await getCellularDeviceReport();

      const rows = data.cellularDevices
        .filter(d => d.phoneNumber)
        .map(d => ({
          'Called Line': d.phoneNumber,
          'Assigned To': d.assignedTo || '',
          'Title': d.title || '',
          'Worker ID': d.workerId || '',
          'Device': d.deviceName || '',
          'Serial': d.serialNumber || '',
          'IMEI': d.imei || '',
          'SIM Operator': d.simOperator || '',
          'Network Type': d.connectivityType || '',
        }));

      if (rows.length === 0) {
        alert('No cellular devices with phone numbers found.');
        return;
      }

      const headers = ['Called Line', 'Assigned To', 'Title', 'Worker ID', 'Device', 'Serial', 'IMEI', 'SIM Operator', 'Network Type'];
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(rows, headers, `Phone_Number_Report_${date}.csv`);
    } catch (err) {
      console.error('Failed to generate phone report:', err);
      alert('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isEsperConfigured()) return null;

  return (
    <button
      className="btn btn-phone-report"
      onClick={handleExport}
      disabled={loading}
      title="Download phone number spreadsheet for cellular devices"
    >
      {loading ? (
        <>
          <FontAwesomeIcon icon={faSpinner} spin />
          Exporting...
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faPhone} />
          Phone Report
        </>
      )}
    </button>
  );
};

export default PhoneNumberReport;
