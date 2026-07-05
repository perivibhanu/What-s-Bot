import React, { useEffect, useState } from 'react';
import axios from 'axios';

import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/Students.css'; // Reusing students CSS for similar layout

function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [activeTab, setActiveTab] = useState('teaching'); // 'teaching' or 'lab_assistant'
  
  const [formData, setFormData] = useState({ 
    name: '', 
    department: '', 
    contactDetails: '', 
    labName: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');


  const role = localStorage.getItem('role');
  const dept = localStorage.getItem('dept');
  const Wrapper = role === 'dept_admin' ? DeptLayout : Layout;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStaff(); }, [activeTab]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      // Pass type to backend to filter
      const res = await axios.get(`http://localhost:5000/api/staff?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (role === 'dept_admin') {
        setStaffList(res.data.filter(s => s.department === dept));
      } else {
        setStaffList(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData, type: activeTab };
      
      if (role === 'dept_admin') {
        payload.department = dept;
      }
      
      await axios.post('http://localhost:5000/api/staff', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({ name: '', department: '', contactDetails: '', labName: '' });
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add staff member');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/staff/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStaff();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // ── Download Excel template ─────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/staff/import/template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'staff_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download template');
    }
  };

  // ── Bulk import Excel/CSV ───────────────────────────────────────────────────
  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select a file first');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await axios.post('http://localhost:5000/api/staff/import/bulk', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setImportResult(res.data);
      fetchStaff();
    } catch (err) {
      setImportResult({
        message: err.response?.data?.error || 'Import failed',
        summary: { success: 0, skipped: 0, failed: 0 },
        isError: true
      });
    } finally {
      setImporting(false);
    }
  };

  // ── Search & Filter ─────────────────────────────────────────────────────────
  const departments = [...new Set(staffList.map(s => s.department))].sort();
  const filtered = staffList.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactDetails.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = filterBranch ? s.department === filterBranch : true;
    return matchSearch && matchBranch;
  });

  return (
    <Wrapper>
      <div className="students-header">
        <div>
          <h1>Staff Management</h1>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('teaching')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: activeTab === 'teaching' ? '#eef2ff' : 'white', color: activeTab === 'teaching' ? '#4f46e5' : '#333', cursor: 'pointer', fontWeight: activeTab === 'teaching' ? 'bold' : 'normal' }}
            >
              👨‍🏫 Teaching Staff
            </button>
            <button 
              onClick={() => setActiveTab('lab_assistant')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: activeTab === 'lab_assistant' ? '#eef2ff' : 'white', color: activeTab === 'lab_assistant' ? '#4f46e5' : '#333', cursor: 'pointer', fontWeight: activeTab === 'lab_assistant' ? 'bold' : 'normal' }}
            >
              🔬 Lab Assistants
            </button>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-import" onClick={() => { setShowImport(true); setImportResult(null); }}>
            📥 Bulk Import
          </button>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            ➕ Add {activeTab === 'teaching' ? 'Staff' : 'Assistant'}
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍  Search by name or ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {role !== 'dept_admin' && (
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {(searchTerm || filterBranch) && (
          <button className="btn-clear" onClick={() => { setSearchTerm(''); setFilterBranch(''); }}>
            ✕ Clear
          </button>
        )}
        <span className="showing-count">Showing {filtered.length} of {staffList.length}</span>
      </div>

      {/* ── Staff Table ── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Department</th>
              {activeTab === 'lab_assistant' && <th>Lab Name</th>}
              <th>Contact Details (Phone/Email)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'lab_assistant' ? 7 : 6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  📭 No {activeTab === 'teaching' ? 'teaching staff' : 'lab assistants'} found.
                </td>
              </tr>
            ) : (
              filtered.map((s, idx) => (
                <tr key={s._id}>
                  <td style={{ color: '#999', fontSize: '13px' }}>{idx + 1}</td>
                  <td><strong>{s.name}</strong></td>
                  <td><span className="branch-tag">{s.department}</span></td>
                  {activeTab === 'lab_assistant' && <td>{s.labName}</td>}
                  <td>{s.contactDetails}</td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(s._id, s.name)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>➕ Add {activeTab === 'teaching' ? 'Teaching Staff' : 'Lab Assistant'}</h2>
            <form onSubmit={handleSubmit}>
              <input placeholder="Full Name" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              
              {role !== 'dept_admin' && (
                <input placeholder="Department (e.g. CSE, ECE)" value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })} required />
              )}
              
              <input placeholder="Contact Details (Phone / Email)" value={formData.contactDetails}
                onChange={e => setFormData({ ...formData, contactDetails: e.target.value })} required />

              {activeTab === 'lab_assistant' && (
                <input placeholder="Lab Name (e.g. Computer Lab 1)" value={formData.labName}
                  onChange={e => setFormData({ ...formData, labName: e.target.value })} required />
              )}
              
              <div className="modal-actions">
                <button type="submit">Add</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Import Modal ── */}
      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); setImportResult(null); }}>
          <div className="modal-box import-modal" onClick={e => e.stopPropagation()}>
            <h2>📥 Bulk Import Staff & Lab Assistants</h2>

            <div className="import-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Download the Excel Template</h4>
                <p>Fill in your staff and lab assistants details.</p>
                <button className="btn-template" onClick={handleDownloadTemplate}>
                  ⬇️ Download Template (.xlsx)
                </button>
              </div>
            </div>

            <div className="import-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Upload Your Filled File</h4>
                <p>Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong></p>
                <form onSubmit={handleBulkImport}>
                  <label className="file-drop-zone">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={e => { setImportFile(e.target.files[0]); setImportResult(null); }}
                      style={{ display: 'none' }}
                    />
                    {importFile
                      ? <span>📄 {importFile.name}</span>
                      : <span>📂 Click to select Excel or CSV file</span>}
                  </label>

                  <button type="submit" className="btn-import-submit" disabled={importing || !importFile}>
                    {importing ? '⏳ Importing...' : '🚀 Import Data'}
                  </button>
                </form>
              </div>
            </div>

            {importResult && (
              <div className={`import-result ${importResult.isError ? 'result-error' : 'result-success'}`}>
                <p className="result-message">{importResult.message}</p>
                {importResult.summary && (
                  <div className="result-stats">
                    <span className="stat-success">✅ Added: {importResult.summary.success}</span>
                    <span className="stat-skip">⏭️ Skipped: {importResult.summary.skipped}</span>
                    <span className="stat-fail">❌ Failed: {importResult.summary.failed}</span>
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <details>
                    <summary>View {importResult.errors.length} errors</summary>
                    <ul className="error-list">
                      {importResult.errors.map((e, i) => (
                        <li key={i}>Row {e.row}: {e.reason} ({e.data?.contactDetails || 'unknown'})</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <button className="btn-close-import" onClick={() => { setShowImport(false); setImportResult(null); }}>
              Close
            </button>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export default StaffManagement;
