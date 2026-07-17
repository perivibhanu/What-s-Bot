import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Students.css'; 

function StaffIssuesFeedback() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [pendingStatus, setPendingStatus] = useState(''); // 'Under Review' or 'Resolved'
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/feedback/staff-issues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIssues(res.data);
    } catch (err) {
      console.error('Failed to fetch staff issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const openMessageModal = (issue, status) => {
    setSelectedIssue(issue);
    setPendingStatus(status);
    setAdminMessage('');
    setShowMessageModal(true);
  };

  const handleUpdateStatus = async (e) => {
    e?.preventDefault();
    if (!selectedIssue) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/feedback/staff-issues/${selectedIssue._id}/status`,
        { status: pendingStatus, adminMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowMessageModal(false);
      setSelectedIssue(null);
      fetchIssues();
    } catch (err) {
      alert('Failed to update issue');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="students-header">
        <div>
          <h1>👔 Staff Issues</h1>
          <p className="student-count">
            Manage complaints and requests from Staff members.
          </p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>TICKET ID</th>
              <th>STAFF</th>
              <th>DEPARTMENT</th>
              <th>MOBILE</th>
              <th>DESCRIPTION</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign:'center'}}>Loading...</td></tr>
            ) : issues.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign:'center'}}>No staff issues found.</td></tr>
            ) : (
              issues.map(issue => (
                <tr key={issue._id}>
                  <td style={{ fontWeight: 'bold' }}>{issue.ticketId}</td>
                  <td>{issue.staffId?.name || 'Unknown'}</td>
                  <td>{issue.staffId?.department || '-'}</td>
                  <td>{issue.staffId?.mobileNumber || '-'}</td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                    {issue.description}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '13px',
                      backgroundColor: issue.status === 'Resolved' ? '#dcfce7' : issue.status === 'Under Review' ? '#fef9c3' : '#fee2e2',
                      color: issue.status === 'Resolved' ? '#166534' : issue.status === 'Under Review' ? '#854d0e' : '#991b1b'
                    }}>
                      {issue.status}
                    </span>
                  </td>
                  <td>{new Date(issue.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                      {issue.status === 'Open' && (
                        <button 
                          onClick={() => openMessageModal(issue, 'Under Review')}
                          style={{ padding: '5px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Verify / View
                        </button>
                      )}
                      {issue.status !== 'Resolved' && (
                        <button 
                          onClick={() => openMessageModal(issue, 'Resolved')}
                          style={{ padding: '5px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Mark Solved
                        </button>
                      )}
                      {issue.status === 'Resolved' && (
                        <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>✓ Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Action Modal */}
      {showMessageModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1rem' }}>
              {pendingStatus === 'Under Review' ? 'Verify Issue' : 'Resolve Issue'}
            </h2>
            <p style={{ marginBottom: '1rem', color: '#475569' }}>
              <strong>Ticket:</strong> {selectedIssue?.ticketId} <br/>
              <strong>Staff:</strong> {selectedIssue?.staffId?.name}
            </p>
            
            <form onSubmit={handleUpdateStatus}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Admin Message / Resolution Note (Optional)
                </label>
                <textarea 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc', minHeight: '100px' }}
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Will be sent via WhatsApp to the staff..."
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowMessageModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '5px', background: 'white', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updating}
                  style={{ 
                    padding: '8px 16px', 
                    border: 'none', 
                    borderRadius: '5px', 
                    background: pendingStatus === 'Resolved' ? '#22c55e' : '#3b82f6', 
                    color: 'white', 
                    cursor: updating ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {updating ? 'Updating...' : `Confirm ${pendingStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default StaffIssuesFeedback;
