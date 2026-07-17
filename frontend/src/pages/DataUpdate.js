import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/DataUpdate.css';

function DataUpdate({ type, title, description, icon }) {
  const [filter, setFilter] = useState({
    isAllStudents: type === 'transport', // default true for transport
    batch: '22',
    branch: type === 'attendance' ? (localStorage.getItem('dept') || 'ECE') : 'ECE',
    section: 'A',
    feeColumns: {
      collegeFee: true,
      hostelFee: true,
      transportationFee: true,
      breakageFee: true,
    }
  });
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/data/template`, 
        { ...filter, type }, 
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filter.branch}_Batch${filter.batch}_Sec${filter.section}_${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(`Failed to download template. Ensure there are students in this exact section in the database.`);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a filled template file first');
      return;
    }

    setStatus('uploading');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('batch', filter.batch);
    formData.append('branch', filter.branch);
    formData.append('section', filter.section);
    formData.append('type', type);
    formData.append('isAllStudents', filter.isAllStudents);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/data/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setStatus('success');
      setResult(res.data);
    } catch (err) {
      setStatus('error');
      setResult({
        error: err.response?.data?.error || 'Upload failed',
        details: err.response?.data?.details
      });
    }
  };

  const WrapperLayout = type === 'attendance' ? DeptLayout : Layout;

  return (
    <WrapperLayout>
      <div className="data-update-page">
        <div className="page-header">
          <h1>{icon} {title}</h1>
          <p>{description}</p>
        </div>

        <div className="update-card">
          {/* Step 1: Filter */}
          <div className="update-section">
            <div className="step-badge">1</div>
            <div className="section-content">
              <h3>Select Target Group</h3>
              
              {type === 'transport' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox" 
                      checked={filter.isAllStudents}
                      onChange={e => setFilter({ ...filter, isAllStudents: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    Send to All Students (Entire College)
                  </label>
                </div>
              )}

              <div className="filter-grid" style={{ opacity: filter.isAllStudents ? 0.5 : 1, pointerEvents: filter.isAllStudents ? 'none' : 'auto' }}>
                <div className="filter-item">
                  <label>Batch Year (e.g. 2022)</label>
                  <input 
                    type="text" 
                    value={filter.batch} 
                    onChange={e => setFilter({ ...filter, batch: e.target.value })}
                    placeholder="Enter batch year (e.g. 22)"
                    disabled={filter.isAllStudents}
                  />
                </div>
                <div className="filter-item">
                  <label>Department</label>
                  <select value={filter.branch} onChange={e => setFilter({ ...filter, branch: e.target.value })} disabled={filter.isAllStudents || type === 'attendance'}>
                    {type === 'attendance' ? (
                      <option value={filter.branch}>{filter.branch}</option>
                    ) : (
                      <>
                        <option value="ECE">ECE</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="EEE">EEE</option>
                        <option value="MECH">MECH</option>
                        <option value="AIDS">AIDS</option>
                        <option value="MECHATRONICS">Mechatronics</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Section</label>
                  <select value={filter.section} onChange={e => setFilter({ ...filter, section: e.target.value })} disabled={filter.isAllStudents}>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              {type === 'fees' && (
                <div className="fee-columns-selection" style={{ marginTop: '20px' }}>
                  <h4>Select Fee Columns for Excel</h4>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={filter.feeColumns.collegeFee}
                        onChange={e => setFilter({ ...filter, feeColumns: { ...filter.feeColumns, collegeFee: e.target.checked }})}
                      /> College Fee
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={filter.feeColumns.hostelFee}
                        onChange={e => setFilter({ ...filter, feeColumns: { ...filter.feeColumns, hostelFee: e.target.checked }})}
                      /> Hostel Fee
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={filter.feeColumns.transportationFee}
                        onChange={e => setFilter({ ...filter, feeColumns: { ...filter.feeColumns, transportationFee: e.target.checked }})}
                      /> Transportation Fee
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={filter.feeColumns.breakageFee}
                        onChange={e => setFilter({ ...filter, feeColumns: { ...filter.feeColumns, breakageFee: e.target.checked }})}
                      /> Common Breakage Fee
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="divider" />

          <hr className="divider" />

          {/* Step 2: Download Template (Hidden for Transport) */}
          {type !== 'transport' && (
            <>
              <div className="update-section">
                <div className="step-badge">2</div>
                <div className="section-content">
                  <h3>Get the Template</h3>
                  <p>Download the pre-filled Excel template for this class.</p>
                  <button className="btn-download" onClick={handleDownloadTemplate}>
                    ⬇️ Download {title} Template
                  </button>
                </div>
              </div>
              <hr className="divider" />
            </>
          )}

          {/* Step 3: Upload */}
          <div className="update-section">
            <div className="step-badge">{type === 'transport' ? '2' : '3'}</div>
            <div className="section-content">
              <h3>Upload Updates</h3>
              {type === 'transport' && (
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Please ensure your Excel file contains these columns exactly: 
                  <strong> sl.no, Registration number, Bus Name, Boarding point, Time</strong>
                </p>
              )}
              
              <form className="upload-form" onSubmit={handleUpload}>
                <label className="file-drop">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => { setFile(e.target.files[0]); setResult(null); setStatus(null); }}
                    style={{ display: 'none' }}
                  />
                  {file ? <span>📄 {file.name}</span> : <span>📂 Click to select filled Excel file</span>}
                </label>
                
                <button type="submit" className={`btn-send ${status === 'uploading' ? 'loading' : ''}`} disabled={status === 'uploading' || !file}>
                  {status === 'uploading' ? '⏳ Processing...' : '🚀 Update Database'}
                </button>
              </form>

              {status === 'success' && result && (
                <div className="result-box success">
                  <h4>✅ {result.message}</h4>
                  {result.summary?.errors?.length > 0 && (
                    <div className="error-list">
                      <strong>⚠️ Warnings:</strong>
                      <ul>
                        {result.summary.errors.map((err, i) => <li key={i}>Row {err.row}: {err.reason}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {status === 'error' && result && (
                <div className="result-box error">
                  <h4>❌ Upload Failed</h4>
                  <p>{result.error}</p>
                  {result.details && <small>{result.details}</small>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WrapperLayout>
  );
}

export default DataUpdate;
