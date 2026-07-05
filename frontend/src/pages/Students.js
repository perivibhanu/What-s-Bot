import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DeptLayout from '../components/DeptLayout';
import '../styles/Students.css';

function Students() {
  const [students, setStudents]     = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formData, setFormData]     = useState({ regNumber: '', name: '', branch: '', section: '', parentPhoneNumber: '' });
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteBatchYear, setDeleteBatchYear] = useState('');
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [batchYears, setBatchYears] = useState([]);
  const navigate = useNavigate();

  const role = localStorage.getItem('role');
  const dept = localStorage.getItem('dept');
  const Wrapper = role === 'dept_admin' ? DeptLayout : Layout;

  useEffect(() => { 
    fetchStudents(); 
    fetchBatchYears();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBatchYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/students/batch-years', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatchYears(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (role === 'dept_admin') {
        setStudents(res.data.filter(s => s.branch === dept));
      } else {
        setStudents(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Add single student ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData };
      if (role === 'dept_admin') {
        payload.branch = dept;
      }
      await axios.post('http://localhost:5000/api/students', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({ regNumber: '', name: '', branch: '', section: '', parentPhoneNumber: '' });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add student');
    }
  };

  // ── Download Excel template ─────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/students/import/template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.xlsx');
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
      const res = await axios.post('http://localhost:5000/api/students/import/bulk', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setImportResult(res.data);
      fetchStudents();
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

  // ── Bulk Delete by Batch ────────────────────────────────────────────────────
  const handleBulkDelete = async (e) => {
    e.preventDefault();
    if (!deleteBatchYear) return;
    
    if (!window.confirm(`Are you sure you want to delete ALL students from batch ${deleteBatchYear}? This action cannot be undone.`)) {
      return;
    }
    
    setDeletingBatch(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/students/bulk-delete/${deleteBatchYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      setShowBulkDeleteModal(false);
      setDeleteBatchYear('');
      fetchStudents();
      fetchBatchYears();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete batch');
    } finally {
      setDeletingBatch(false);
    }
  };

  // ── Search & Filter ─────────────────────────────────────────────────────────
  const branches = [...new Set(students.map(s => s.branch))].sort();
  const filtered = students.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.regNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = filterBranch ? s.branch === filterBranch : true;
    return matchSearch && matchBranch;
  });

  return (
    <Wrapper>
      {/* ── Header ── */}
      <div className="students-header">
        <div>
          <h1>Students</h1>
          <p className="student-count">
            Total: <strong>{students.length}</strong> &nbsp;|&nbsp;
            Registered: <strong>{students.filter(s => s.isRegistered).length}</strong>
          </p>
        </div>
        <div className="header-actions">
          {role !== 'dept_admin' && (
            <button className="btn-delete" onClick={() => setShowBulkDeleteModal(true)}>
              🗑️ Bulk Delete
            </button>
          )}
          <button className="btn-import" onClick={() => { setShowImport(true); setImportResult(null); }}>
            📥 Bulk Import
          </button>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            ➕ Add Student
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍  Search by name or reg number..."
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
            <option value="">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        {(searchTerm || filterBranch) && (
          <button className="btn-clear" onClick={() => { setSearchTerm(''); setFilterBranch(''); }}>
            ✕ Clear
          </button>
        )}
        <span className="showing-count">Showing {filtered.length} of {students.length}</span>
      </div>

      {/* ── Students Table ── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Reg Number</th>
              <th>Name</th>
              <th>Branch</th>
              <th>Section</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {students.length === 0
                    ? '📭 No students yet. Use Bulk Import to add 1500+ students at once!'
                    : '🔍 No students match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((s, idx) => (
                <tr key={s._id}>
                  <td style={{ color: '#999', fontSize: '13px' }}>{idx + 1}</td>
                  <td><strong>{s.regNumber}</strong></td>
                  <td>{s.name}</td>
                  <td><span className="branch-tag">{s.branch}</span></td>
                  <td>{s.section}</td>
                  <td>
                    <span className={`status-badge ${s.isRegistered ? 'registered' : 'pending'}`}>
                      {s.isRegistered ? '✅ Registered' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-view-sm" onClick={() => navigate(`/students/${s._id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Single Student Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>➕ Add Student</h2>
            <form onSubmit={handleSubmit}>
              <input placeholder="Reg Number (e.g. 21CS001)" value={formData.regNumber}
                onChange={e => setFormData({ ...formData, regNumber: e.target.value })} required />
              <input placeholder="Full Name" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              {role !== 'dept_admin' && (
                <input placeholder="Branch (e.g. CSE, ECE)" value={formData.branch}
                  onChange={e => setFormData({ ...formData, branch: e.target.value })} required />
              )}
              <input placeholder="Section (e.g. A, B)" value={formData.section}
                onChange={e => setFormData({ ...formData, section: e.target.value })} required />
              <input placeholder="Parent WhatsApp No (Optional)" value={formData.parentPhoneNumber}
                onChange={e => setFormData({ ...formData, parentPhoneNumber: e.target.value })} />
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
            <h2>📥 Bulk Import Students</h2>

            {/* Step 1 - Download Template */}
            <div className="import-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Download the Excel Template</h4>
                <p>Fill in all your 1500+ students in this format:</p>
                <div className="template-preview">
                  <table>
                    <thead>
                      <tr><th>Reg Number</th><th>Name</th><th>Branch</th><th>Section</th><th>Mobile Number</th><th>Parent Mobile</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>21CS001</td><td>Arun Kumar</td><td>CSE</td><td>A</td><td>9876543210</td><td>9876543220</td></tr>
                      <tr><td>21EC001</td><td>Priya Sharma</td><td>ECE</td><td>B</td><td>9876543211</td><td>9876543221</td></tr>
                      <tr><td style={{color:'#999'}}>...</td><td style={{color:'#999'}}>...</td><td style={{color:'#999'}}>...</td><td style={{color:'#999'}}>...</td><td style={{color:'#999'}}>...</td><td style={{color:'#999'}}>...</td></tr>
                    </tbody>
                  </table>
                </div>
                <button className="btn-template" onClick={handleDownloadTemplate}>
                  ⬇️ Download Template (.xlsx)
                </button>
              </div>
            </div>

            {/* Step 2 - Upload filled file */}
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
                    {importing ? '⏳ Importing...' : '🚀 Import Students'}
                  </button>
                </form>
              </div>
            </div>

            {/* Import Result */}
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
                        <li key={i}>Row {e.row}: {e.reason} ({e.data?.regNumber || 'unknown'})</li>
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

      {/* ── Bulk Delete Modal ── */}
      {showBulkDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowBulkDeleteModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>🗑️ Bulk Delete Students</h2>
            <p>Delete all students belonging to a specific batch year.</p>
            <form onSubmit={handleBulkDelete}>
              <select
                value={deleteBatchYear}
                onChange={e => setDeleteBatchYear(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
              >
                <option value="">Select Batch Year</option>
                {batchYears.map(year => (
                  <option key={year} value={year}>Batch {year} (e.g. 1133{year}...)</option>
                ))}
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-delete" disabled={deletingBatch || !deleteBatchYear}>
                  {deletingBatch ? 'Deleting...' : 'Delete Batch'}
                </button>
                <button type="button" onClick={() => setShowBulkDeleteModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export default Students;
