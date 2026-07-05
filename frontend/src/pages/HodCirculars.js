import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DeptLayout from '../components/DeptLayout';
import '../styles/Circulars.css'; // Reusing Circulars.css

function HodCirculars() {
  const [circulars, setCirculars] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', fileUrl: '', fileName: '' });
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(null);

  const dept = localStorage.getItem('dept');

  useEffect(() => {
    fetchCirculars();
  }, []);

  const fetchCirculars = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/circulars?type=hod&department=${dept}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCirculars(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, Word documents, and images (JPG, PNG, GIF) are allowed');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await axios.post('http://localhost:5000/api/circulars/upload', formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData({
        ...formData,
        fileUrl: res.data.fileUrl,
        fileName: res.data.fileName,
        fileType: res.data.fileType
      });
      alert('File uploaded successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      alert('Please upload a file first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        type: 'hod',
        department: dept
      };
      await axios.post('http://localhost:5000/api/circulars', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({ title: '', description: '', fileUrl: '', fileName: '' });
      fetchCirculars();
      alert('Circular created successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create circular');
    }
  };

  const handleSend = async (id) => {
    if (!window.confirm(`Are you sure you want to send this circular to all registered ${dept} students?`)) {
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/circulars/${id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchCirculars();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send circular');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id) => {
    if (!window.confirm(`Are you sure you want to re-send this circular to all registered ${dept} students?`)) {
      return;
    }

    setResending(id);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/circulars/${id}/resend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchCirculars();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to re-send circular');
    } finally {
      setResending(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this circular?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/circulars/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCirculars();
      alert('Circular deleted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete circular');
    }
  };

  return (
    <DeptLayout>
      <div className="circulars-header">
        <h1>{dept} HOD Circulars</h1>
        <button onClick={() => setShowModal(true)}>Create Circular</button>
      </div>

      <div className="circulars-grid">
        {circulars.map(circular => (
          <div key={circular._id} className="circular-card">
            <div className="circular-header">
              <h3>{circular.title}</h3>
              <span className={`status ${circular.status}`}>
                {circular.status === 'sent' ? '✅ Sent' : '📝 Draft'}
              </span>
            </div>
            <p className="circular-description">{circular.description}</p>
            <div className="circular-info">
              <p>📄 {circular.fileName}</p>
              {circular.status === 'sent' && (
                <p>👥 Sent to {circular.recipientCount} {dept} students</p>
              )}
              <p>📅 {new Date(circular.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="circular-actions">
              <a href={circular.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-view">
                View File
              </a>
              {circular.status === 'draft' && (
                <button 
                  onClick={() => handleSend(circular._id)} 
                  disabled={sending}
                  className="btn-send"
                >
                  {sending ? 'Sending...' : 'Send to All'}
                </button>
              )}
              {circular.status === 'sent' && (
                <button 
                  onClick={() => handleResend(circular._id)} 
                  disabled={resending === circular._id}
                  className="btn-resend"
                >
                  {resending === circular._id ? '🔄 Re-sending...' : '🔄 Re-send'}
                </button>
              )}
              <button onClick={() => handleDelete(circular._id)} className="btn-delete">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Create New HOD Circular</h2>
            <form onSubmit={handleSubmit}>
              <input 
                placeholder="Circular Title" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                required 
              />
              <textarea 
                placeholder="Description (optional)" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="4"
              />
              <div className="file-upload">
                <label htmlFor="file-input" className="file-label">
                  {uploading ? 'Uploading...' : formData.fileName || 'Choose File (PDF/Word/Image)'}
                </label>
                <input 
                  id="file-input"
                  type="file" 
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" disabled={uploading}>Create</button>
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setFormData({ title: '', description: '', fileUrl: '', fileName: '' });
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DeptLayout>
  );
}

export default HodCirculars;
