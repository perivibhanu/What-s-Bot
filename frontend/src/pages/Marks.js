import React, { useState } from 'react';
import axios from 'axios';
import DeptLayout from '../components/DeptLayout';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import '../styles/Marks.css';

function Marks() {
  const [filter, setFilter] = useState({
    batch: '22',
    branch: localStorage.getItem('dept') || 'ECE',
    section: [],
    examType: 'mid1'
  });

  const handleSectionToggle = (sec) => {
    setFilter(prev => {
      const current = prev.section || [];
      if (current.includes(sec)) {
        return { ...prev, section: current.filter(s => s !== sec) };
      } else {
        return { ...prev, section: [...current, sec] };
      }
    });
  };

  const [subjectsCount, setSubjectsCount] = useState(6);
  const [file, setFile] = useState(null);
  const [optionalMessage, setOptionalMessage] = useState('');
  const [status, setStatus] = useState(null); // 'uploading', 'success', 'error'
  const [result, setResult] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('https://what-s-bot.onrender.com/api/marks/template', 
        { ...filter, subjectsCount }, 
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filter.branch}_Batch${filter.batch}_Sec${(filter.section || []).join('-') || 'All'}_MarksTemplate.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download template. Ensure there are students in these exact sections in the database.');
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
    formData.append('section', JSON.stringify(filter.section || []));
    formData.append('examType', filter.examType);
    if (optionalMessage.trim()) {
      formData.append('message', optionalMessage.trim());
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('https://what-s-bot.onrender.com/api/marks/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
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

  const handleClearMarks = async () => {
    const secString = (filter.section || []).join(', ');
    if (!window.confirm(`⚠️ WARNING ⚠️\n\nAre you sure you want to completely delete all Mid-1, Mid-2, and Model Exam marks for ${filter.branch} Batch ${filter.batch} Section(s) ${secString}?\n\nThis action cannot be undone!`)) {
      return;
    }
    
    setStatus('uploading');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('https://what-s-bot.onrender.com/api/marks/clear', 
        { batch: filter.batch, branch: filter.branch, section: filter.section }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('success');
      setResult({ message: res.data.message, summary: { success: 0, failed: 0 } });
    } catch (err) {
      setStatus('error');
      setResult({
        error: err.response?.data?.error || 'Failed to clear marks',
        details: err.response?.data?.details
      });
    }
  };

  return (
    <DeptLayout>
      <div className="marks-page">
        <div className="marks-header">
          <h1>🎯 Targeted Marks Notification</h1>
          <p>Send marks to a specific group securely via WhatsApp</p>
        </div>

        <div className="marks-card">
          {/* Step 1: Filter */}
          <div className="marks-section">
            <div className="step-badge">1</div>
            <div className="section-content">
              <h3>Select Target Group</h3>
              <div className="filter-grid">
                <div className="filter-item">
                  <label>Batch Year (e.g. 2022)</label>
                  <input 
                    type="number" 
                    value={filter.batch} 
                    onChange={e => setFilter({ ...filter, batch: e.target.value })}
                    placeholder="Enter start year (e.g. 2022)"
                  />
                </div>
                <div className="filter-item">
                  <label>Department</label>
                  <select value={filter.branch} disabled>
                    <option value={filter.branch}>{filter.branch}</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Sections</label>
                  <div style={{ marginTop: '5px' }}>
                    <MultiSelectDropdown 
                      options={['A', 'B', 'C', 'D']}
                      selected={filter.section || []}
                      onChange={handleSectionToggle}
                      placeholder="Select Sections"
                    />
                  </div>
                </div>
                <div className="filter-item">
                  <label>Exam Type</label>
                  <select value={filter.examType} onChange={e => setFilter({ ...filter, examType: e.target.value })}>
                    <option value="mid1">Mid Exam 1</option>
                    <option value="mid2">Mid Exam 2</option>
                    <option value="model">Model Exam</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button 
                  onClick={handleClearMarks}
                  style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  🗑️ Clear All Marks for this Group
                </button>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* Step 2: Download Template */}
          <div className="marks-section">
            <div className="step-badge">2</div>
            <div className="section-content">
              <h3>Get the Template</h3>
              <p>The system will generate an Excel file containing <b>ONLY</b> the students in the selected group.</p>
              
              <div className="template-actions">
                <div className="subj-count-wrapper">
                  <label>Number of Subjects:</label>
                  <input 
                    type="number" 
                    min="1" max="10" 
                    value={subjectsCount} 
                    onChange={e => setSubjectsCount(e.target.value)} 
                  />
                </div>
                <button className="btn-download" onClick={handleDownloadTemplate}>
                  ⬇️ Download Template
                </button>
              </div>
              <small className="hint-text">
                <b>Tip:</b> Open the downloaded file and rename "Subject 1", "Subject 2" to actual names like "Maths", "Physics". Leave blank for absent.
              </small>
            </div>
          </div>

          <hr className="divider" />

          {/* Step 3: Upload and Send */}
          <div className="marks-section">
            <div className="step-badge">3</div>
            <div className="section-content">
              <h3>Push and Publish</h3>
              <p>Here you push and publish the latest excel which will feed by the admin.</p>
              
              <form className="upload-form" onSubmit={handleUpload}>
                <div className="upload-box" style={{ marginTop: '15px' }}>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={e => { setFile(e.target.files[0]); setResult(null); setStatus(null); }}
                    id="marks-upload"
                    className="file-input"
                  />
                  <label htmlFor="marks-upload" className="file-label">
                    <span className="icon">📁</span>
                    {file ? file.name : 'Choose filled template...'}
                  </label>
                </div>

                <div className="filter-item" style={{ marginTop: '15px' }}>
                  <label>Optional Information/News (Sent to Students)</label>
                  <textarea
                    value={optionalMessage}
                    onChange={e => setOptionalMessage(e.target.value)}
                    placeholder="e.g., Parent Teacher Meeting is next Monday."
                    rows="3"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical' }}
                  />
                </div>

                <button 
                  type="submit" 
                  className={`btn-send ${status === 'uploading' ? 'loading' : ''}`}
                  disabled={status === 'uploading' || !file}
                  style={{ marginTop: '20px' }}
                >
                  {status === 'uploading' ? '⏳ Processing & Sending...' : '🚀 Push and Publish'}
                </button>
              </form>

              {/* Results Area */}
              {status === 'success' && result && (
                <div className="result-box success">
                  <h4>✅ {result.message}</h4>
                  <div className="stats-row">
                    <span className="stat-success">Successfully sent: {result.summary.success}</span>
                    <span className="stat-fail">Failed: {result.summary.failed}</span>
                  </div>
                  {result.summary.errors?.length > 0 && (
                    <div className="error-list">
                      <strong>⚠️ Warnings / Errors:</strong>
                      <ul>
                        {result.summary.errors.map((err, i) => (
                          <li key={i}>Row {err.row}: {err.reason}</li>
                        ))}
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
    </DeptLayout>
  );
}

export default Marks;
