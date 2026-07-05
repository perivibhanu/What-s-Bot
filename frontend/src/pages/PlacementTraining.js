import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeptLayout from '../components/DeptLayout';
import '../styles/Timetables.css'; // Reusing Timetables.css for identical layout

function PlacementTraining() {
  const [filter, setFilter] = useState({
    isAllStudents: false,
    batch: '22',
    branch: localStorage.getItem('dept') || 'ECE',
    section: 'A'
  });
  
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // 'uploading', 'success', 'error'
  const [materials, setMaterials] = useState([]);
  const [sending, setSending] = useState(null);
  const [resending, setResending] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://what-s-bot.onrender.com/api/placement', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter by department if needed, but since it's a dept admin, 
      // the backend should probably filter. Currently backend returns all,
      // so let's filter here for safety.
      const dept = localStorage.getItem('dept');
      const filtered = res.data.filter(m => m.branch === dept || m.branch === 'ALL');
      setMaterials(filtered);
    } catch (err) {
      console.error('Failed to fetch placement materials', err);
    }
  };

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
      alert('Please select a file first');
      return;
    }

    setStatus('uploading');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('batch', filter.isAllStudents ? 'ALL' : filter.batch);
    formData.append('branch', filter.isAllStudents ? 'ALL' : filter.branch);
    formData.append('section', filter.isAllStudents ? 'ALL' : filter.section);

    try {
      const token = localStorage.getItem('token');
      await axios.post('https://what-s-bot.onrender.com/api/placement/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setStatus('success');
      setFile(null);
      fetchMaterials();
      
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus('error');
      alert(err.response?.data?.error || 'Upload failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://what-s-bot.onrender.com/api/placement/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMaterials();
    } catch (err) {
      alert('Failed to delete material');
    }
  };

  const handleSend = async (id) => {
    if (!window.confirm('Send this material to all students in this group via WhatsApp?')) return;
    
    setSending(id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://what-s-bot.onrender.com/api/placement/${id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ Material sent successfully! (Placeholder logic executed)`);
      fetchMaterials();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send material');
    } finally {
      setSending(null);
    }
  };

  const handleResend = async (id) => {
    if (!window.confirm('Re-send this material?')) return;
    
    setResending(id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://what-s-bot.onrender.com/api/placement/${id}/resend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ Material re-sent successfully! (Placeholder logic executed)`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to re-send material');
    } finally {
      setResending(null);
    }
  };

  return (
    <DeptLayout>
      <div className="timetables-page">
        <div className="timetables-header">
          <h1>💼 Placement Training Materials</h1>
          <p>Upload training documents, schedules, or images and broadcast to students.</p>
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
                  Send to All Students (Entire Department)
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
                  <label>Section</label>
                  <select value={filter.section} onChange={e => setFilter({ ...filter, section: e.target.value })} disabled={filter.isAllStudents}>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
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
              <p>Upload your document (PDF, Excel, Word) or image.</p>
              
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
                  {status === 'uploading' ? '⏳ Uploading...' : '⬆️ Upload Material'}
                </button>
              </form>

              {status === 'success' && (
                <div className="success-msg" style={{ marginTop: '15px', color: '#28a745', fontWeight: 'bold' }}>
                  ✅ Material uploaded successfully!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Existing Materials */}
        <div className="existing-timetables">
          <h3>Existing Placement Materials</h3>
          <div className="timetables-grid">
            {materials.map(mat => (
              <div key={mat._id} className="timetable-card">
                <div className="tt-preview" style={{ padding: '20px', fontSize: '40px', background: '#eef2f5' }}>
                  {getFileTypeIcon(mat.fileType)}
                  <span className="file-type-badge">{getFileTypeBadge(mat.fileType)}</span>
                </div>
                <div className="tt-info">
                  <p className="tt-class">{mat.branch} - Batch {mat.batch}</p>
                  <p className="tt-section">Section {mat.section}</p>
                  
                  {mat.fileName && <p className="tt-meta tt-filename">📎 {mat.fileName}</p>}
                  
                  <div className="tt-actions" style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                    {mat.isSent ? (
                      <button 
                        className="btn-resend" 
                        onClick={() => handleResend(mat._id)}
                        disabled={resending === mat._id}
                        style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {resending === mat._id ? '⏳ ...' : '🔄 Re-send'}
                      </button>
                    ) : (
                      <button 
                        className="btn-send" 
                        onClick={() => handleSend(mat._id)}
                        disabled={sending === mat._id}
                        style={{ flex: 1, background: '#28a745', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {sending === mat._id ? '⏳ Sending...' : '📤 Send to All'}
                      </button>
                    )}
                    
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDelete(mat._id)}
                      style={{ padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {materials.length === 0 && (
              <p className="no-timetables">No materials uploaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </DeptLayout>
  );
}

export default PlacementTraining;
