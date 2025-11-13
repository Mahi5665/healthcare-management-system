import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function HealthDataUpload({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      if (['csv', 'json', 'txt'].includes(fileExt)) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a CSV, JSON, or TXT file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patient/upload-health-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          recordsAdded: data.records_added,
          filename: data.file.filename
        });
        setFile(null);
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Health Data</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Upload health data from your fitness tracker or smart ring
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Supported formats: CSV, JSON, TXT
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <label className="cursor-pointer">
            <span className="text-blue-500 hover:text-blue-600">
              Choose a file
            </span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,.txt"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-gray-500 mt-1">
            or drag and drop
          </p>
        </div>

        {file && (
          <div className="mt-4 flex items-center space-x-2 p-3 bg-gray-50 rounded">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">{file.name}</span>
            <span className="text-xs text-gray-500">
              ({(file.size / 1024).toFixed(2)} KB)
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {result && result.success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">Upload successful!</p>
            <p>{result.recordsAdded} health records imported from {result.filename}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format Example:</h4>
        <pre className="text-xs text-blue-800 bg-white p-2 rounded overflow-x-auto">
{`date,heart_rate,steps,sleep_hours,calories,blood_oxygen
2024-11-01,72,8500,7.5,2100,98
2024-11-02,75,9200,8.0,2300,97
2024-11-03,70,7800,7.0,2000,99`}
        </pre>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload Health Data'}
      </button>
    </div>
  );
}