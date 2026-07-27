import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Students.css'; 

function SecurityGuards() {
  const [guards, setGuards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    gateAssigned: 'Gate 1 (Hostel Gate)',
    shift: 'Day Shift'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGuards();
  }, []);

  const fetchGuards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/security-guards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuards(res.data);
    } catch (err) {
      console.error('Error fetching security guards:', err);
      setError('Failed to fetch security guards.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL}/api/security-guards`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({
        name: '',
        mobileNumber: '',
        gateAssigned: 'Gate 1 (Hostel Gate)',
        shift: 'Day Shift'
      });
      fetchGuards();
    } catch (err) {
      console.error('Error adding security guard:', err);
      alert(err.response?.data?.error || 'Failed to add security guard.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this security guard?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/security-guards/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGuards();
    } catch (err) {
      console.error('Error deleting security guard:', err);
      alert('Failed to delete security guard.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>🛡️ Security Guards Management</h1>
          <p style={{ color: '#64748b' }}>Add security guards who scan Digital Outing Passes at Gate 1 and Gate 2</p>
        </div>
        <button 
          className="action-button primary"
          onClick={() => setShowModal(true)}
          style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
        >
          + Add New Security Guard
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container" style={{ marginTop: '20px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>NAME</th>
              <th>MOBILE NUMBER (WHATSAPP)</th>
              <th>ASSIGNED GATE</th>
              <th>SHIFT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Loading security guards...</td></tr>
            ) : guards.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No security guards added yet.</td></tr>
            ) : (
              guards.map((guard, index) => (
                <tr key={guard._id}>
                  <td>{index + 1}</td>
                  <td style={{fontWeight: '600'}}>{guard.name}</td>
                  <td>{guard.mobileNumber}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      backgroundColor: guard.gateAssigned.includes('1') ? '#e0f2fe' : '#fef3c7',
                      color: guard.gateAssigned.includes('1') ? '#0369a1' : '#92400e',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>
                      {guard.gateAssigned}
                    </span>
                  </td>
                  <td>{guard.shift}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(guard._id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: '#fff', padding: '25px', borderRadius: '14px',
            width: '100%', maxWidth: '460px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{marginTop: 0, marginBottom: '20px'}}>Add New Security Guard</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>Security Guard Name:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                />
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>WhatsApp Mobile Number:</label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210 (10 digits)"
                  required
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                />
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>Assigned Gate:</label>
                <select
                  name="gateAssigned"
                  value={formData.gateAssigned}
                  onChange={handleInputChange}
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                >
                  <option value="Gate 1 (Hostel Gate)">🏢 Gate 1 (Hostel Gate)</option>
                  <option value="Gate 2 (Main Gate)">🏛️ Gate 2 (Main Gate)</option>
                </select>
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>Shift:</label>
                <select
                  name="shift"
                  value={formData.shift}
                  onChange={handleInputChange}
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                >
                  <option value="Day Shift">Day Shift</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="General Shift">General Shift</option>
                </select>
              </div>

              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{padding: '10px 18px', borderRadius: '8px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: '600'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{padding: '10px 20px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600'}}
                >
                  Add Security Guard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default SecurityGuards;
