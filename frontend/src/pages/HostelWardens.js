import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/StaffManagement.css'; // Reusing staff management styles

function HostelWardens() {
  const [wardens, setWardens] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    block: '',
    yearHead: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWardens();
  }, []);

  const fetchWardens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/wardens`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWardens(res.data);
    } catch (err) {
      console.error('Error fetching wardens:', err);
      setError('Failed to fetch wardens.');
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
      await axios.post(`${process.env.REACT_APP_API_URL}/api/wardens`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowModal(false);
      setFormData({ name: '', mobileNumber: '', block: '', yearHead: '' });
      fetchWardens();
      alert('Warden added successfully!');
    } catch (err) {
      console.error('Error adding warden:', err);
      alert(err.response?.data?.error || 'Failed to add warden.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warden?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/wardens/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWardens();
      alert('Warden deleted successfully!');
    } catch (err) {
      console.error('Error deleting warden:', err);
      alert('Failed to delete warden.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>👨‍✈️ Hostel Wardens</h1>
        <button onClick={() => setShowModal(true)} className="btn-add">
          ➕ Add Warden
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>NAME</th>
              <th>MOBILE NUMBER</th>
              <th>BLOCK</th>
              <th>YEAR HEAD</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading...</td></tr>
            ) : wardens.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>No wardens found.</td></tr>
            ) : (
              wardens.map((warden, index) => (
                <tr key={warden._id}>
                  <td>{index + 1}</td>
                  <td>{warden.name}</td>
                  <td>{warden.mobileNumber}</td>
                  <td>{warden.block}</td>
                  <td>{warden.yearHead}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(warden._id)}
                      className="btn-delete-small"
                      style={{ background: 'transparent', border: 'none', color: '#e53e3e', cursor: 'pointer' }}
                      title="Delete Warden"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Warden</h2>
            <form onSubmit={handleSubmit} className="add-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile Number (with country code)</label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 919876543210"
                  required
                />
              </div>
              <div className="form-group">
                <label>Block</label>
                <input
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleInputChange}
                  placeholder="e.g. Boys Hostel A"
                  required
                />
              </div>
              <div className="form-group">
                <label>Year Head</label>
                <input
                  type="text"
                  name="yearHead"
                  value={formData.yearHead}
                  onChange={handleInputChange}
                  placeholder="e.g. First Year"
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Warden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default HostelWardens;
