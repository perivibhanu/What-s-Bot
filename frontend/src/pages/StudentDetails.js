import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/StudentDetails.css';

function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const role = localStorage.getItem('role');

  const Wrapper = role === 'dept_admin' ? DeptLayout : Layout;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStudent(); }, [id]);

  const fetchStudent = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`https://what-s-bot.onrender.com/api/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudent(res.data);
      setEditData({
        name: res.data.name,
        branch: res.data.branch,
        section: res.data.section,
        phoneNumber: res.data.phoneNumber || '',
        parentPhoneNumber: res.data.parentPhoneNumber || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://what-s-bot.onrender.com/api/students/${id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditMode(false);
      fetchStudent();
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://what-s-bot.onrender.com/api/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/students');
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
      setDeleting(false);
    }
  };

  if (!student) return (
    <Wrapper>
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading student details...</p>
      </div>
    </Wrapper>
  );

  const isVerified = student.isRegistered && student.phoneNumber;

  return (
    <Wrapper>
      <div className="details-page">

        {/* ── Back Button ── */}
        <button className="btn-back" onClick={() => navigate('/students')}>
          ← Back to Students
        </button>

        {/* ── Student Card ── */}
        <div className="student-card">

          {/* Avatar + Status */}
          <div className="student-avatar-row">
            <div className="avatar">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="student-name">{student.name}</h1>
              <p className="student-reg">{student.regNumber}</p>
              <span className={`verify-badge ${isVerified ? 'verified' : 'not-verified'}`}>
                {isVerified ? '✅ WhatsApp Verified' : '⏳ Not Verified'}
              </span>
            </div>
          </div>

          {/* ── Info Grid ── */}
          <div className="info-grid">

            <div className="info-item">
              <label>Registration Number</label>
              <p>{student.regNumber}</p>
            </div>

            <div className="info-item">
              <label>Full Name</label>
              {editMode
                ? <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                : <p>{student.name}</p>
              }
            </div>

            <div className="info-item">
              <label>Branch / Department</label>
              {editMode && role !== 'dept_admin'
                ? <input value={editData.branch} onChange={e => setEditData({ ...editData, branch: e.target.value })} />
                : <p><span className="branch-chip">{student.branch}</span></p>
              }
            </div>

            <div className="info-item">
              <label>Section</label>
              {editMode
                ? <input value={editData.section} onChange={e => setEditData({ ...editData, section: e.target.value })} />
                : <p>{student.section}</p>
              }
            </div>

            <div className="info-item">
              <label>WhatsApp Number</label>
              {editMode
                ? <input
                    value={editData.phoneNumber}
                    placeholder="e.g. 9876543210"
                    onChange={e => setEditData({ ...editData, phoneNumber: e.target.value })}
                  />
                : <p>{student.phoneNumber
                    ? `+${student.phoneNumber}`
                    : <span className="no-phone">Not set — import with phone number</span>}
                  </p>
              }
            </div>

            <div className="info-item">
              <label>Parent WhatsApp Number</label>
              {editMode
                ? <input
                    value={editData.parentPhoneNumber || ''}
                    placeholder="e.g. 9876543220"
                    onChange={e => setEditData({ ...editData, parentPhoneNumber: e.target.value })}
                  />
                : <p>{student.parentPhoneNumber
                    ? `+${student.parentPhoneNumber}`
                    : <span className="no-phone">Not set</span>}
                  </p>
              }
            </div>

            <div className="info-item">
              <label>Verification Status</label>
              <p>{isVerified
                ? '✅ Student verified — can use WhatsApp bot'
                : '⏳ Not verified — add phone number to enable WhatsApp access'}
              </p>
            </div>

            <div className="info-item">
              <label>Added On</label>
              <p>{new Date(student.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}</p>
            </div>

          </div>

          {/* ── Action Buttons ── */}
          <div className="action-row">
            {editMode ? (
              <>
                <button className="btn-save" onClick={handleUpdate} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <button className="btn-cancel" onClick={() => { setEditMode(false); setEditData({ name: student.name, branch: student.branch, section: student.section, phoneNumber: student.phoneNumber || '', parentPhoneNumber: student.parentPhoneNumber || '' }); }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn-edit" onClick={() => setEditMode(true)}>
                  ✏️ Edit Info
                </button>
                <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                  {deleting ? '⏳ Deleting...' : '🗑️ Delete Student'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </Wrapper>
  );
}

export default StudentDetails;
