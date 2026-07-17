import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Students.css'; // Reusing table styles

function IssuesFeedback() {
  const [issues, setIssues] = useState([]);
  const [filterCategory, setFilterCategory] = useState('All');
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
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/feedback/issues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIssues(res.data);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
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
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/feedback/issues/${selectedIssue._id}/status`,
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

  const filteredIssues = filterCategory === 'All' 
    ? issues 
    : issues.filter(i => i.category === filterCategory);

  return (
    <Layout>
      <div className="students-header">
        <div>
          <h1>🎫 Helpdesk & Issues</h1>
          <p className="student-count">
            Manage student complaints and requests.
          </p>
        </div>
      </div>

      <div className="search-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc' }}
        >
          <option value="All">All Categories</option>
          <option value="College">College</option>
          <option value="Hostel">Hostel</option>
          <option value="Bus">Bus</option>
        </select>
        <span style={{ margin: 'auto 0' }}>Showing {filteredIssues.length} issues</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>TICKET ID</th>
              <th>STUDENT</th>
              <th>DEPT/SEC</th>
              <th>CATEGORY</th>
              <th>DESCRIPTION</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign:'center'}}>Loading...</td></tr>
            ) : filteredIssues.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign:'center'}}>No issues found.</td></tr>
            ) : (
              filteredIssues.map(issue => (
                <tr key={issue._id}>
                  <td style={{ fontWeight: 'bold' }}>{issue.ticketId}</td>
                  <td>
                    {issue.studentId?.name || 'Unknown'}<br/>
                    <small style={{color:'#64748b'}}>{issue.studentId?.regNumber}</small>
                  </td>
                  <td>
                    {issue.studentId?.branch || '-'} / {issue.studentId?.section || '-'}
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: issue.category === 'Hostel' ? '#fef3c7' : issue.category === 'Bus' ? '#dbeafe' : '#f3f4f6',
                      color: issue.category === 'Hostel' ? '#d97706' : issue.category === 'Bus' ? '#2563eb' : '#4b5563'
                    }}>
                      {issue.category}
                    </span>
                  </td>
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
                        <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px' }}>✓ Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for adding a message */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>{pendingStatus === 'Resolved' ? '✅ Resolve Ticket' : '🔍 Verify Ticket'}</h2>
            <p>Ticket: <strong>{selectedIssue?.ticketId}</strong></p>
            <p>You are about to change the status to <strong>{pendingStatus}</strong>. This will send an automated WhatsApp message to the student.</p>
            
            <form onSubmit={handleUpdateStatus} style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Add a custom message (Optional):
              </label>
              <textarea 
                rows="4" 
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem' }}
                placeholder="Write a message to the student..."
                value={adminMessage}
                onChange={e => setAdminMessage(e.target.value)}
              />
              <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowMessageModal(false)} style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updating}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: pendingStatus === 'Resolved' ? '#22c55e' : '#eab308', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px' 
                  }}
                >
                  {updating ? 'Sending...' : 'Update & Notify Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default IssuesFeedback;
