import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/Circulars.css'; 

function StaffMessages() {
  const [messages, setMessages] = useState([]);
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({ title: '', message: '', fileUrl: '', fileName: '', fileType: '', cloudinaryPublicId: '' });
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Target Modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(null);
  
  const role = localStorage.getItem('role');
  const dept = localStorage.getItem('dept');
  const Wrapper = role === 'dept_admin' ? DeptLayout : Layout;

  const [targetPayload, setTargetPayload] = useState({
    targetAudience: 'all',
    isAll: role === 'dept_admin' ? false : true,
    targetDepartment: role === 'dept_admin' ? dept : ''
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://what-s-bot.onrender.com/api/staff-messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await axios.post('https://what-s-bot.onrender.com/api/staff-messages/upload', formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setCreateFormData({
        ...createFormData,
        fileUrl: res.data.fileUrl,
        fileName: res.data.fileName,
        fileType: res.data.fileType,
        cloudinaryPublicId: res.data.cloudinaryPublicId
      });
      alert('File uploaded successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://what-s-bot.onrender.com/api/staff-messages', createFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Draft created successfully!');
      setShowCreateModal(false);
      setCreateFormData({ title: '', message: '', fileUrl: '', fileName: '', fileType: '', cloudinaryPublicId: '' });
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create draft');
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`https://what-s-bot.onrender.com/api/staff-messages/${selectedMessageId}/send`, targetPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      setShowTargetModal(false);
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id) => {
    if (!window.confirm('Are you sure you want to re-send this message to the exact same recipients?')) {
      return;
    }
    setResending(id);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`https://what-s-bot.onrender.com/api/staff-messages/${id}/resend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to re-send message');
    } finally {
      setResending(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://what-s-bot.onrender.com/api/staff-messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages();
      alert('Message deleted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete message');
    }
  };

  return (
    <Wrapper>
      <div className="circulars-header">
        <h1>Staff Messages</h1>
        <button onClick={() => setShowCreateModal(true)}>Create Draft</button>
      </div>

      <div className="circulars-grid">
        {messages.map(msg => (
          <div key={msg._id} className="circular-card">
            <div className="circular-header">
              <h3>{msg.title}</h3>
              <span className={`status ${msg.status}`}>
                {msg.status === 'sent' ? '✅ Sent' : '📝 Draft'}
              </span>
            </div>
            {msg.fileUrl && (
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{msg.fileType === 'image' ? '🖼️' : '📄'}</span>
                <span style={{ fontSize: '14px', color: '#555', wordBreak: 'break-all' }}>{msg.fileName}</span>
              </div>
            )}
            <p className="circular-description" style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</p>
            <div className="circular-info" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
              {msg.status === 'sent' ? (
                <>
                  <p>👥 Sent to {msg.recipientCount} recipients</p>
                  <p>🎯 Audience: {msg.targetAudience === 'teaching' ? 'Teaching Staff' : msg.targetAudience === 'lab_assistant' ? 'Lab Assistants' : 'All Staff'}</p>
                  {msg.targetDepartment && <p>🏷️ Dept: {msg.targetDepartment}</p>}
                  <p>📅 {new Date(msg.sentAt).toLocaleString()}</p>
                </>
              ) : (
                <p>📅 Created: {new Date(msg.createdAt).toLocaleDateString()}</p>
              )}
            </div>
            <div className="circular-actions">
              {msg.fileUrl && (
                <button 
                  onClick={() => window.open(msg.fileUrl, '_blank')}
                  className="btn-view"
                >
                  View File
                </button>
              )}
              {msg.status === 'draft' && (
                <button 
                  onClick={() => { 
                    setSelectedMessageId(msg._id); 
                    setTargetPayload({
                      targetAudience: 'all',
                      isAll: role === 'dept_admin' ? false : true,
                      targetDepartment: role === 'dept_admin' ? dept : ''
                    });
                    setShowTargetModal(true); 
                  }} 
                  disabled={sending && selectedMessageId === msg._id}
                  className="btn-send"
                >
                  {sending && selectedMessageId === msg._id ? 'Sending...' : 'Send'}
                </button>
              )}
              {msg.status === 'sent' && (
                <button 
                  onClick={() => handleResend(msg._id)} 
                  disabled={resending === msg._id}
                  className="btn-resend"
                >
                  {resending === msg._id ? '🔄 Re-sending...' : '🔄 Re-send'}
                </button>
              )}
              <button onClick={() => handleDelete(msg._id)} className="btn-delete">
                Delete
              </button>
            </div>
          </div>
        ))}
        {messages.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666' }}>No messages sent yet.</p>}
      </div>

      {/* ── Create Draft Modal ── */}
      {showCreateModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2>Create Draft Message</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>MESSAGE TITLE (Internal Reference)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Tomorrow Holiday Announcement" 
                  value={createFormData.title}
                  onChange={e => setCreateFormData({ ...createFormData, title: e.target.value })}
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>MESSAGE CONTENT</label>
                <textarea 
                  placeholder="Type the exact message that will be sent via WhatsApp..." 
                  value={createFormData.message}
                  onChange={e => setCreateFormData({ ...createFormData, message: e.target.value })}
                  rows="6"
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
                  ATTACHMENT (Optional) {uploading && <span style={{color: '#3b82f6'}}>- Uploading...</span>}
                </label>
                {createFormData.fileName && (
                  <p style={{ fontSize: '13px', color: '#22c55e', margin: '0 0 5px 0' }}>
                    ✅ Uploaded: {createFormData.fileName}
                  </p>
                )}
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="submit" disabled={creating || uploading} style={{ background: '#22c55e', color: 'white' }}>
                  {creating ? 'Saving...' : 'Save Draft'}
                </button>
                <button type="button" onClick={() => {
                  setShowCreateModal(false);
                  setCreateFormData({ title: '', message: '', fileUrl: '', fileName: '', fileType: '', cloudinaryPublicId: '' });
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Targeting Modal ── */}
      {showTargetModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2>🎯 Select Target Group</h2>
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold' }}>Target Audience</label>
                <select 
                  value={targetPayload.targetAudience}
                  onChange={e => setTargetPayload({ 
                    ...targetPayload, 
                    targetAudience: e.target.value, 
                    isAll: role === 'dept_admin' ? false : true,
                    targetDepartment: role === 'dept_admin' ? dept : ''
                  })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="all">All {role === 'dept_admin' ? `${dept} Staff` : 'College Staff'}</option>
                  <option value="teaching">Teaching Staff</option>
                  <option value="lab_assistant">Lab Assistants</option>
                </select>
              </div>

              {role !== 'dept_admin' ? (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px' }}>
                    <input 
                      type="checkbox" 
                      checked={targetPayload.isAll}
                      onChange={e => setTargetPayload({ ...targetPayload, isAll: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>
                      Send to {targetPayload.targetAudience === 'all' ? 'All College Staff' : targetPayload.targetAudience === 'teaching' ? 'All Teaching Staff' : 'All Lab Assistants'}
                    </span>
                  </label>

                  {!targetPayload.isAll && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>DEPARTMENT</label>
                        <select 
                          value={targetPayload.targetDepartment}
                          onChange={e => setTargetPayload({ ...targetPayload, targetDepartment: e.target.value })}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '5px' }}
                        >
                          <option value="">Any Dept (All)</option>
                          <option value="CSE">CSE</option>
                          <option value="IT">IT</option>
                          <option value="ECE">ECE</option>
                          <option value="EEE">EEE</option>
                          <option value="MECH">MECH</option>
                          <option value="CIVIL">CIVIL</option>
                          <option value="AIDS">AIDS</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                  📢 Sending to <strong>{targetPayload.targetAudience === 'all' ? 'All Staff' : targetPayload.targetAudience === 'teaching' ? 'Teaching Staff' : 'Lab Assistants'}</strong> in the <strong>{dept}</strong> Department.
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="submit" disabled={sending} style={{ background: '#22c55e', color: 'white' }}>
                  {sending ? 'Sending Broadcast...' : 'Send Broadcast'}
                </button>
                <button type="button" onClick={() => setShowTargetModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export default StaffMessages;
