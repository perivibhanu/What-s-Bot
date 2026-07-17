import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeptLayout from '../components/DeptLayout';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import '../styles/Timetables.css';

function Timetables() {
  const [filter, setFilter] = useState({
    isAllStudents: false,
    batch: '22',
    branch: localStorage.getItem('dept') || 'ECE',
    section: []
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
  
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // 'uploading', 'success', 'error'
  const [timetables, setTimetables] = useState([]);
  const [sending, setSending] = useState(null); // ID of timetable being sent
  const [resending, setResending] = useState(null); // ID of timetable being resent

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/timetables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimetables(res.data);
    } catch (err) {
      console.error('Failed to fetch timetables', err);
    }
  };

  // Helper: get file type icon for existing timetables
  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'word': return '📝';
      case 'excel': return '📊';
      default: return '🖼️';
    }
  };

  const getFileTypeBadge = (fileType) => {
    switch (fileType) {
      case 'pdf': return 'PDF';
      case 'word': return 'Word';
      case 'excel': return 'Excel';
      default: return 'Image';
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a filled Excel file first');
      return;
    }

    setStatus('uploading');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('batch', filter.isAllStudents ? 'ALL' : filter.batch);
    formData.append('branch', filter.isAllStudents ? 'ALL' : filter.branch);
    formData.append('section', filter.isAllStudents ? 'ALL' : JSON.stringify(filter.section || []));

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/timetables/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStatus('success');
      setFile(null);
      fetchTimetables();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus('error');
      alert(err.response?.data?.error || 'Upload failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timetable?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/timetables/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTimetables();
    } catch (err) {
      alert('Failed to delete timetable');
    }
  };

  const handleSend = async (id) => {
    if (!window.confirm('Send this timetable to all registered students in this class via WhatsApp?')) return;
    
    setSending(id);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/timetables/${id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.sentCount === 0) {
        alert(`⚠️ No messages sent.\nFound ${res.data.matchedCount} students in this class.\nOnly ${res.data.registeredCount} are registered on WhatsApp.`);
      } else {
        alert(`✅ Timetable sent successfully to ${res.data.sentCount} students!`);
      }
      fetchTimetables();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send timetable');
    } finally {
      setSending(null);
    }
  };

  const handleResend = async (id) => {
    if (!window.confirm('Re-send this timetable to all registered students?')) return;
    
    setResending(id);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/timetables/${id}/resend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.sentCount === 0) {
        alert(`⚠️ No messages sent.\nFound ${res.data.matchedCount} students in this class.\nOnly ${res.data.registeredCount} are registered on WhatsApp.`);
      } else {
        alert(`✅ Timetable re-sent successfully to ${res.data.sentCount} students!`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to re-send timetable');
    } finally {
      setResending(null);
    }
  };

  return (
    <DeptLayout>
      <div className="timetables-page">
        <div className="timetables-header">
          <h1>📅 Upload Timetables & Seating</h1>
          <p>Upload a class template and broadcast via WhatsApp.</p>
        </div>

        <div className="timetables-card">
          
          {/* Step 1: Filter */}
          <div className="timetables-section">
            <div className="step-badge">1</div>
            <div className="section-content">
              <h3>Select Target Group</h3>
              
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

              <div className="filter-grid" style={{ opacity: filter.isAllStudents ? 0.5 : 1, pointerEvents: filter.isAllStudents ? 'none' : 'auto' }}>
                <div className="filter-item">
                  <label>Batch Year (e.g. 2022)</label>
                  <input 
                    type="number" 
                    value={filter.batch} 
                    onChange={e => setFilter({ ...filter, batch: e.target.value })}
                    placeholder="Enter start year (e.g. 2022)"
                    disabled={filter.isAllStudents}
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
                      disabled={filter.isAllStudents}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* Step 2: Upload and Send */}
          <div className="timetables-section">
            <div className="step-badge">2</div>
            <div className="section-content">
              <h3>Upload & Send via WhatsApp</h3>
              <p>Upload your college's Excel sheet containing the timetable and room allocations.</p>
              
              <form className="upload-form" onSubmit={handleUpload}>
                <label className="file-drop">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={e => setFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  {file ? <span>📎 {file.name}</span> : <span>📂 Click to select file (Image, PDF, Excel, Word)</span>}
                </label>
                
                <button 
                  type="submit" 
                  className={`btn-upload ${status === 'uploading' ? 'loading' : ''}`}
                  disabled={status === 'uploading' || !file}
                  style={{ width: '100%', marginTop: '15px' }}
                >
                  {status === 'uploading' ? '⏳ Uploading...' : '⬆️ Upload Timetable & Seating'}
                </button>
              </form>

              {status === 'success' && (
                <div className="success-msg" style={{ marginTop: '15px', color: '#28a745', fontWeight: 'bold' }}>
                  ✅ Timetable uploaded successfully! It is now in the list below.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Existing Timetables */}
        <div className="existing-timetables">
          <h3>Existing Timetables & Seating Plans</h3>
          <div className="timetables-grid">
            {timetables.map(tt => (
              <div key={tt._id} className="timetable-card">
                <div className="tt-preview" style={{ padding: '20px', fontSize: '40px', background: '#eef2f5' }}>
                  {getFileTypeIcon(tt.fileType)}
                  <span className="file-type-badge">{getFileTypeBadge(tt.fileType)}</span>
                </div>
                <div className="tt-info">
                  <p className="tt-class">{tt.branch} - Batch {tt.batch}</p>
                  <p className="tt-section">Section {tt.section}</p>
                  
                  {tt.fileName && <p className="tt-meta tt-filename">📎 {tt.fileName}</p>}
                  {tt.seatingDetails && tt.seatingDetails.length > 0 && (
                    <p className="tt-meta tt-seating-badge">🪑 Seating for {tt.seatingDetails.length} students</p>
                  )}
                  
                  <div className="tt-actions" style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                    {tt.isSent ? (
                      <button 
                        className="btn-resend" 
                        onClick={() => handleResend(tt._id)}
                        disabled={resending === tt._id}
                        style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {resending === tt._id ? '⏳ ...' : '🔄 Re-send'}
                      </button>
                    ) : (
                      <button 
                        className="btn-send" 
                        onClick={() => handleSend(tt._id)}
                        disabled={sending === tt._id}
                        style={{ flex: 1, background: '#28a745', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {sending === tt._id ? '⏳ Sending...' : '📤 Send to All'}
                      </button>
                    )}
                    
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDelete(tt._id)}
                      style={{ padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {timetables.length === 0 && (
              <p className="no-timetables">No timetables uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </DeptLayout>
  );
}

export default Timetables;
