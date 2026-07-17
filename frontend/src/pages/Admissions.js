import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Admissions.css';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admissions`;

function Admissions() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, underReview: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (courseFilter !== 'all') params.course = courseFilter;
      if (search) params.search = search;

      const [appsRes, statsRes] = await Promise.all([
        axios.get(API, { headers: authHeaders, params }),
        axios.get(`${API}/stats`, { headers: authHeaders })
      ]);
      setApplications(appsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching admissions:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, courseFilter, search, token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/${id}/status`, { status }, { headers });
      fetchData();
      if (selectedApp && selectedApp._id === id) {
        setSelectedApp(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const deleteApplication = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await axios.delete(`${API}/${id}`, { headers });
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting application:', err);
      alert('Failed to delete application');
    }
  };

  const exportCSV = () => {
    window.open(`${API}/export`, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const statusLabel = (status) => {
    const map = {
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="admissions-page">
        <h1>📋 Admission Applications</h1>

        {/* ── Stats Cards ──────────────────────────────────────────────── */}
        <div className="admission-stats">
          <div className="admission-stat-card">
            <h3>Total</h3>
            <div className="stat-number">{stats.total}</div>
          </div>
          <div className="admission-stat-card submitted">
            <h3>Submitted</h3>
            <div className="stat-number">{stats.submitted}</div>
          </div>
          <div className="admission-stat-card under-review">
            <h3>Under Review</h3>
            <div className="stat-number">{stats.underReview}</div>
          </div>
          <div className="admission-stat-card approved">
            <h3>Approved</h3>
            <div className="stat-number">{stats.approved}</div>
          </div>
          <div className="admission-stat-card rejected">
            <h3>Rejected</h3>
            <div className="stat-number">{stats.rejected}</div>
          </div>
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="admissions-toolbar">
          <input
            type="text"
            placeholder="🔍 Search by name, app number, mobile, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            <option value="CSE">CSE</option>
            <option value="AIDS">AIDS</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="IT">IT</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Mechatronics">Mechatronics</option>
          </select>
          <button className="btn-export" onClick={exportCSV}>📥 Export CSV</button>
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="admissions-table-container">
          {applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Applications Yet</h3>
              <p>Applications submitted via WhatsApp will appear here.</p>
            </div>
          ) : (
            <table className="admissions-table">
              <thead>
                <tr>
                  <th>App #</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Choice 1</th>
                  <th>Cutoff</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app._id} onClick={() => setSelectedApp(app)}>
                    <td style={{ fontWeight: 600, color: '#667eea' }}>{app.applicationNumber}</td>
                    <td>{app.fullName}</td>
                    <td>{app.mobile}</td>
                    <td>{app.courseChoice1}</td>
                    <td>{app.twelfthCutoff || '—'}</td>
                    <td><span className={`status-badge ${app.status}`}>{statusLabel(app.status)}</span></td>
                    <td style={{ fontSize: '0.8rem', color: '#888' }}>{formatDate(app.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Detail Modal ─────────────────────────────────────────────── */}
        {selectedApp && (
          <div className="admission-modal-overlay" onClick={() => setSelectedApp(null)}>
            <div className="admission-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>{selectedApp.fullName}</h2>
                  <div className="app-number">{selectedApp.applicationNumber}</div>
                </div>
                <button className="modal-close-btn" onClick={() => setSelectedApp(null)}>✕</button>
              </div>

              <div className="modal-body">
                {/* Personal */}
                <div className="modal-section">
                  <h3>👤 Personal Details</h3>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <label>Full Name</label>
                      <span>{selectedApp.fullName}</span>
                    </div>
                    <div className="modal-field">
                      <label>Email</label>
                      <span>{selectedApp.email}</span>
                    </div>
                    <div className="modal-field">
                      <label>Mobile</label>
                      <span>{selectedApp.mobile}</span>
                    </div>
                    <div className="modal-field">
                      <label>WhatsApp</label>
                      <span>{selectedApp.whatsappNumber}</span>
                    </div>
                    <div className="modal-field">
                      <label>Date of Birth</label>
                      <span>{selectedApp.dateOfBirth}</span>
                    </div>
                    <div className="modal-field">
                      <label>Gender</label>
                      <span>{selectedApp.gender}</span>
                    </div>
                    <div className="modal-field">
                      <label>Community</label>
                      <span>{selectedApp.community || '—'}</span>
                    </div>
                    <div className="modal-field">
                      <label>Nationality</label>
                      <span>{selectedApp.nationality}</span>
                    </div>
                  </div>
                </div>

                {/* Parent */}
                <div className="modal-section">
                  <h3>👨‍👩‍👧 Parent Details</h3>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <label>Parent Name</label>
                      <span>{selectedApp.parentName}</span>
                    </div>
                    <div className="modal-field">
                      <label>Parent Mobile</label>
                      <span>{selectedApp.parentMobile}</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="modal-section">
                  <h3>🏠 Address</h3>
                  <div className="modal-grid">
                    <div className="modal-field full-width">
                      <label>Street</label>
                      <span>{selectedApp.address?.street || '—'}</span>
                    </div>
                    <div className="modal-field">
                      <label>District</label>
                      <span>{selectedApp.address?.district || '—'}</span>
                    </div>
                    <div className="modal-field">
                      <label>State</label>
                      <span>{selectedApp.address?.state || '—'}</span>
                    </div>
                    <div className="modal-field">
                      <label>Pincode</label>
                      <span>{selectedApp.address?.pincode || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* 10th */}
                <div className="modal-section">
                  <h3>📚 10th Standard</h3>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <label>School</label>
                      <span>{selectedApp.tenthSchool}</span>
                    </div>
                    <div className="modal-field">
                      <label>Place</label>
                      <span>{selectedApp.tenthPlace}</span>
                    </div>
                    <div className="modal-field">
                      <label>Board & Batch</label>
                      <span>{selectedApp.tenthBoard} ({selectedApp.tenthBatch})</span>
                    </div>
                    <div className="modal-field">
                      <label>Percentage</label>
                      <span>{selectedApp.tenthPercentage}%</span>
                    </div>
                  </div>
                </div>

                {/* 12th */}
                <div className="modal-section">
                  <h3>🎓 12th Standard</h3>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <label>Reg Number</label>
                      <span>{selectedApp.twelfthRegNumber}</span>
                    </div>
                    <div className="modal-field">
                      <label>School</label>
                      <span>{selectedApp.twelfthSchool}</span>
                    </div>
                    <div className="modal-field">
                      <label>Place</label>
                      <span>{selectedApp.twelfthPlace}</span>
                    </div>
                    <div className="modal-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Board & Batch</label>
                      <span>{selectedApp.twelfthBoard} ({selectedApp.twelfthBatch})</span>
                    </div>
                    <div className="modal-field">
                      <label>Medium</label>
                      <span>{selectedApp.twelfthMedium}</span>
                    </div>
                    
                    {(selectedApp.twelfthBoard === 'Board of Intermediate Education, Andhra Pradesh (BIEAP)' || selectedApp.twelfthBoard === 'Telangana State Board of Intermediate Education (TSBIE)') ? (
                      <>
                        <div className="modal-field">
                          <label>Maths II A / B</label>
                          <span>{selectedApp.twelfthMathsIIA} / {selectedApp.twelfthMathsIIB}</span>
                        </div>
                        <div className="modal-field">
                          <label>Physics (Th / Lab)</label>
                          <span>{selectedApp.twelfthPhysicsTheory} / {selectedApp.twelfthPhysicsLab}</span>
                        </div>
                        <div className="modal-field">
                          <label>Chemistry (Th / Lab)</label>
                          <span>{selectedApp.twelfthChemistryTheory} / {selectedApp.twelfthChemistryLab}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="modal-field">
                          <label>Maths</label>
                          <span>{selectedApp.twelfthMaths}</span>
                        </div>
                        <div className="modal-field">
                          <label>Physics</label>
                          <span>{selectedApp.twelfthPhysics}</span>
                        </div>
                        <div className="modal-field">
                          <label>Chemistry</label>
                          <span>{selectedApp.twelfthChemistry}</span>
                        </div>
                      </>
                    )}
                    <div className="modal-field">
                      <label>Cutoff (/200)</label>
                      <span style={{ fontWeight: 700, color: '#667eea' }}>{selectedApp.twelfthCutoff}</span>
                    </div>
                  </div>
                </div>

                {/* Course Preferences */}
                <div className="modal-section">
                  <h3>🎯 Course Preferences</h3>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <label>Choice 1 (Priority)</label>
                      <span style={{ fontWeight: 600 }}>{selectedApp.courseChoice1}</span>
                    </div>
                    <div className="modal-field">
                      <label>Choice 2</label>
                      <span>{selectedApp.courseChoice2}</span>
                    </div>
                    <div className="modal-field">
                      <label>Choice 3</label>
                      <span>{selectedApp.courseChoice3}</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="modal-section">
                  <h3>📊 Application Status</h3>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <label>Current Status</label>
                      <span className={`status-badge ${selectedApp.status}`}>{statusLabel(selectedApp.status)}</span>
                    </div>
                    <div className="modal-field">
                      <label>Submitted At</label>
                      <span>{formatDate(selectedApp.submittedAt)}</span>
                    </div>
                    {selectedApp.reviewedAt && (
                      <div className="modal-field">
                        <label>Last Reviewed</label>
                        <span>{formatDate(selectedApp.reviewedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-print" onClick={() => window.print()}>🖨️ Print</button>
                <button className="btn-approve" onClick={() => updateStatus(selectedApp._id, 'approved')}>✅ Approve</button>
                <button className="btn-review" onClick={() => updateStatus(selectedApp._id, 'under_review')}>🔍 Review</button>
                <button className="btn-reject" onClick={() => updateStatus(selectedApp._id, 'rejected')}>❌ Reject</button>
                <button className="btn-delete" onClick={() => deleteApplication(selectedApp._id)}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Admissions;
