import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Students.css'; 

function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    busNumber: '',
    routeNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrivers(res.data);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError('Failed to fetch drivers.');
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
      await axios.post(`${process.env.REACT_APP_API_URL}/api/drivers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({
        name: '',
        mobileNumber: '',
        busNumber: '',
        routeNumber: ''
      });
      fetchDrivers();
    } catch (err) {
      console.error('Error adding driver:', err);
      alert(err.response?.data?.error || 'Failed to add driver.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bus driver?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDrivers();
    } catch (err) {
      console.error('Error deleting driver:', err);
      alert('Failed to delete driver.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>🚌 Bus Drivers Management</h1>
          <p style={{ color: '#64748b' }}>Add bus drivers who can broadcast live GPS trips to parents on WhatsApp</p>
        </div>
        <button 
          className="action-button primary"
          onClick={() => setShowModal(true)}
          style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
        >
          + Add New Bus Driver
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container" style={{ marginTop: '20px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>DRIVER NAME</th>
              <th>MOBILE NUMBER (WHATSAPP)</th>
              <th>BUS NUMBER</th>
              <th>ROUTE NUMBER / NAME</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Loading bus drivers...</td></tr>
            ) : drivers.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No bus drivers added yet.</td></tr>
            ) : (
              drivers.map((driver, index) => (
                <tr key={driver._id}>
                  <td>{index + 1}</td>
                  <td style={{fontWeight: '600'}}>{driver.name}</td>
                  <td>{driver.mobileNumber}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#f3e8ff',
                      color: '#6b21a8',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>
                      {driver.busNumber}
                    </span>
                  </td>
                  <td>{driver.routeNumber}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(driver._id)}
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
            <h3 style={{marginTop: 0, marginBottom: '20px'}}>Add New Bus Driver</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>Driver Name:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Suresh Kumar"
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
                  placeholder="e.g. 9876543211 (10 digits)"
                  required
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                />
              </div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>Bus Number:</label>
                <input
                  type="text"
                  name="busNumber"
                  value={formData.busNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. Bus 12 / TN-20-AX-1234"
                  required
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                />
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '6px', fontWeight: '600'}}>Route Number / Name:</label>
                <input
                  type="text"
                  name="routeNumber"
                  value={formData.routeNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. Route 5 - Tambaram to College"
                  required
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                />
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
                  Add Bus Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Drivers;
