import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/CollegeMedia.css';

const API = 'http://localhost:5000/api/college-media';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// ─── Reusable upload / gallery body (used inside TopicCard & DeptDetailPanel) ─
function MediaBody({ topic: initialTopic, onUpdate }) {
  const [topic, setTopic]         = useState(initialTopic);
  const [description, setDesc]    = useState(initialTopic.description || '');
  const [caption, setCaption]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus]       = useState(null);
  const imageRef = useRef();
  const videoRef = useRef();

  useEffect(() => {
    setTopic(initialTopic);
    setDesc(initialTopic.description || '');
  }, [initialTopic]);

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSaveDesc = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/${topic.topic}`, { description }, authHeader());
      setTopic(res.data);
      onUpdate(res.data);
      showStatus('✅ Saved successfully');
    } catch (err) {
      showStatus('❌ ' + (err.response?.data?.error || 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const handleUpload = async (file, mediaType) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    fd.append('mediaType', mediaType);
    try {
      const res = await axios.post(`${API}/${topic.topic}/upload`, fd, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTopic(res.data.topic);
      onUpdate(res.data.topic);
      setCaption('');
      showStatus(`✅ ${mediaType === 'video' ? 'Video' : 'Image'} uploaded!`);
    } catch (err) {
      showStatus('❌ ' + (err.response?.data?.error || 'Upload failed'), 'error');
    } finally { setUploading(false); }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Remove this media item?')) return;
    try {
      const res = await axios.delete(`${API}/${topic.topic}/media/${mediaId}`, authHeader());
      setTopic(res.data.topic);
      onUpdate(res.data.topic);
      showStatus('🗑️ Removed');
    } catch (err) {
      showStatus('❌ Delete failed', 'error');
    }
  };

  const mediaCount = topic.mediaItems?.length || 0;

  return (
    <div className="cm-topic-body">
      {/* Description */}
      <div className="cm-desc-field">
        <label>Description (shown in WhatsApp)</label>
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder={`Brief description for ${topic.title} shown to visitors...`}
          rows={3}
        />
      </div>

      {/* Gallery */}
      <div className="cm-media-gallery">
        <span className="cm-gallery-label">Media Gallery</span>
        {mediaCount === 0 ? (
          <p className="cm-no-media">No media uploaded yet. Use the buttons below to add photos or videos.</p>
        ) : (
          <div className="cm-media-grid">
            {topic.mediaItems.map(item => (
              <div className="cm-media-thumb" key={item._id}>
                {item.type === 'image'
                  ? <img src={item.url} alt={item.caption || 'media'} />
                  : <div className="cm-video-thumb">🎬</div>}
                <span className="cm-media-type-tag">{item.type}</span>
                <button className="cm-delete-media" onClick={() => handleDelete(item._id)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caption */}
      <input
        className="cm-caption-input"
        type="text"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Optional caption for next upload..."
      />

      {/* Upload Buttons */}
      <div className="cm-upload-row">
        <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { handleUpload(e.target.files[0], 'image'); e.target.value = ''; }} />
        <button className="cm-upload-btn image" onClick={() => imageRef.current.click()} disabled={uploading}>
          📷 Add Photo
        </button>

        <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }}
          onChange={e => { handleUpload(e.target.files[0], 'video'); e.target.value = ''; }} />
        <button className="cm-upload-btn video" onClick={() => videoRef.current.click()} disabled={uploading}>
          🎬 Add Video
        </button>
      </div>

      {uploading && (
        <div className="cm-upload-progress">
          <div className="cm-upload-progress-bar" style={{ width: '100%' }} />
        </div>
      )}

      {status && <div className={`cm-status ${status.type}`}>{status.msg}</div>}

      <button className="cm-save-topic-btn" onClick={handleSaveDesc} disabled={saving || uploading}>
        {saving ? 'Saving...' : '💾 Save Description'}
      </button>
    </div>
  );
}

// ─── Regular Topic Card (expand/collapse) ─────────────────────────────────────
function TopicCard({ topic, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const mediaCount = topic.mediaItems?.length || 0;

  return (
    <div className={`cm-topic-card ${expanded ? 'expanded' : ''}`}>
      <div className="cm-topic-header" onClick={() => setExpanded(v => !v)}>
        <div className="cm-topic-info">
          <div className="cm-topic-emoji">{topic.emoji || '📁'}</div>
          <div className="cm-topic-name">
            <h3>{topic.title}</h3>
            <span className="cm-media-count">{mediaCount} media item{mediaCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {mediaCount > 0 && <span className="cm-count-badge">{mediaCount} Files</span>}
          <span className="cm-expand-icon">▼</span>
        </div>
      </div>
      {expanded && <MediaBody topic={topic} onUpdate={onUpdate} />}
    </div>
  );
}

// ─── Departments Drill-Down Section ──────────────────────────────────────────
// Step 1: Click "Departments" card → see 7 dept tiles
// Step 2: Click a dept tile → see that dept's upload form
// Back button → return to dept tiles
function DeptSection({ subDepts, onUpdate }) {
  // null = closed, 'list' = showing 7 tiles, topic_key = showing detail
  const [view, setView] = useState(null);

  const DEPT_TILES = [
    { key: 'dept_aids',         label: 'AIDS',        emoji: '🤖', color: '#6366f1' },
    { key: 'dept_cse',          label: 'CSE',         emoji: '💻', color: '#0891b2' },
    { key: 'dept_ece',          label: 'ECE',         emoji: '📡', color: '#0d9488' },
    { key: 'dept_ee',           label: 'EEE',         emoji: '⚡', color: '#d97706' },
    { key: 'dept_it',           label: 'IT',          emoji: '🌐', color: '#7c3aed' },
    { key: 'dept_mech',         label: 'Mechanical',  emoji: '⚙️', color: '#dc2626' },
    { key: 'dept_mechatronics', label: 'Mechatronics',emoji: '🦾', color: '#059669' },
  ];

  const selectedTile  = DEPT_TILES.find(d => d.key === view);
  const selectedTopic = subDepts.find(t => t.topic === view);
  const isOpen        = view !== null;

  return (
    <div className={`cm-dept-section ${isOpen ? 'open' : ''}`}>

      {/* ── Header row ── */}
      <div
        className="cm-dept-section-header"
        onClick={() => setView(isOpen ? null : 'list')}
      >
        <div className="cm-topic-info">
          <div className="cm-topic-emoji">🏛️</div>
          <div className="cm-topic-name">
            <h3>Departments</h3>
            <span className="cm-media-count">
              {subDepts.reduce((s, t) => s + (t.mediaItems?.length || 0), 0)} total media items across 7 departments
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="cm-count-badge">7 Depts</span>
          <span className="cm-expand-icon" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>

      {/* ── Level 1: 7 Dept Tiles ── */}
      {view === 'list' && (
        <div className="cm-dept-body">
          <p className="cm-dept-prompt">Select a department to manage its photos & videos:</p>
          <div className="cm-dept-tiles">
            {DEPT_TILES.map(tile => {
              const t = subDepts.find(d => d.topic === tile.key);
              const count = t?.mediaItems?.length || 0;
              return (
                <div
                  key={tile.key}
                  className="cm-dept-tile"
                  style={{ '--tile-color': tile.color }}
                  onClick={() => setView(tile.key)}
                >
                  <div className="cm-dept-tile-emoji">{tile.emoji}</div>
                  <div className="cm-dept-tile-label">{tile.label}</div>
                  {count > 0 && (
                    <div className="cm-dept-tile-count">{count} file{count !== 1 ? 's' : ''}</div>
                  )}
                  <div className="cm-dept-tile-arrow">›</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Level 2: Selected Dept Detail ── */}
      {view && view !== 'list' && selectedTopic && (
        <div className="cm-dept-body">
          {/* Back + breadcrumb */}
          <div className="cm-dept-breadcrumb">
            <button className="cm-dept-back-btn" onClick={() => setView('list')}>
              ← Back to Departments
            </button>
            <span className="cm-dept-crumb">
              Departments &rsaquo; {selectedTile?.emoji} {selectedTile?.label}
            </span>
          </div>

          {/* Upload form */}
          <MediaBody topic={selectedTopic} onUpdate={(updated) => {
            onUpdate(updated);
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Intro Card ───────────────────────────────────────────────────────────────
function IntroCard({ topic: initialTopic, onUpdate }) {
  const [topic, setTopic]                 = useState(initialTopic);
  const [introVideoUrl, setIntroVideoUrl] = useState(initialTopic?.introVideoUrl || '');
  const [description, setDesc]            = useState(initialTopic?.description || '');
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const [status, setStatus]               = useState(null);
  const [caption, setCaption]             = useState('');
  const imageRef = useRef();
  const introVideoRef = useRef();

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      setIntroVideoUrl(initialTopic.introVideoUrl || '');
      setDesc(initialTopic.description || '');
    }
  }, [initialTopic]);

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/intro`, { description, introVideoUrl }, authHeader());
      setTopic(res.data);
      onUpdate(res.data);
      showStatus('✅ College overview saved!');
    } catch (err) {
      showStatus('❌ ' + (err.response?.data?.error || 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const handleUploadIntroVideo = async (file) => {
    if (!file) return;
    setUploadingIntro(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('isIntroVideo', 'true');
    try {
      const res = await axios.post(`${API}/intro/upload`, fd, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTopic(res.data.topic);
      setIntroVideoUrl(res.data.topic.introVideoUrl);
      onUpdate(res.data.topic);
      showStatus('✅ Intro video uploaded successfully!');
    } catch (err) {
      showStatus('❌ ' + (err.response?.data?.error || 'Upload failed'), 'error');
    } finally { setUploadingIntro(false); }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    try {
      const res = await axios.post(`${API}/intro/upload`, fd, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTopic(res.data.topic);
      onUpdate(res.data.topic);
      setCaption('');
      showStatus('✅ Campus photo uploaded!');
    } catch (err) {
      showStatus('❌ ' + (err.response?.data?.error || 'Upload failed'), 'error');
    } finally { setUploading(false); }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Remove this photo?')) return;
    try {
      const res = await axios.delete(`${API}/intro/media/${mediaId}`, authHeader());
      setTopic(res.data.topic);
      onUpdate(res.data.topic);
      showStatus('🗑️ Removed');
    } catch (err) {
      showStatus('❌ Delete failed', 'error');
    }
  };

  const campusPhotos = topic?.mediaItems || [];

  return (
    <div className="cm-intro-card">
      <h2>🏫 <span>College Overview</span>
        <small style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '0.75rem' }}>
          — shown when visitor selects "About College"
        </small>
      </h2>
      <div className="cm-intro-fields">
        <div className="cm-field-group">
          <label>Intro Video (MP4)</label>
          {introVideoUrl && (
            <div style={{ marginBottom: '8px' }}>
              <video src={introVideoUrl} controls style={{ maxWidth: '300px', borderRadius: '4px' }} />
            </div>
          )}
          <input ref={introVideoRef} type="file" accept="video/mp4,video/*" style={{ display: 'none' }}
            onChange={e => { handleUploadIntroVideo(e.target.files[0]); e.target.value = ''; }} />
          <button className="cm-upload-btn video" style={{ width: 'auto', padding: '8px 16px', marginBottom: '4px' }}
            onClick={() => introVideoRef.current.click()} disabled={uploadingIntro}>
            {introVideoUrl ? '🎬 Change Intro Video' : '🎬 Upload Intro Video'}
          </button>
          {uploadingIntro && <div style={{ marginTop: 4, fontSize: '0.85rem', color: '#a78bfa' }}>Uploading video, please wait...</div>}
        </div>
        <div className="cm-field-group">
          <label>Welcome Description (WhatsApp text)</label>
          <input type="text" value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Premier engineering college established in..." />
        </div>
        <div className="cm-field-group">
          <label>Campus Photos Caption</label>
          <input type="text" value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Optional caption..." />
        </div>
        <div className="cm-field-group">
          <label>Campus Photos ({campusPhotos.length} uploaded)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {campusPhotos.map(item => (
              <div className="cm-media-thumb" key={item._id} style={{ width: 70, height: 70 }}>
                {item.type === 'image'
                  ? <img src={item.url} alt={item.caption || 'campus'} />
                  : <div className="cm-video-thumb" style={{ fontSize: '1.4rem' }}>🎬</div>}
                <button className="cm-delete-media" onClick={() => handleDeleteMedia(item._id)} title="Remove">✕</button>
              </div>
            ))}
          </div>
          <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { handleUpload(e.target.files[0]); e.target.value = ''; }} />
          <button className="cm-upload-btn image" style={{ width: '100%' }}
            onClick={() => imageRef.current.click()} disabled={uploading}>
            📷 Upload Campus Photo
          </button>
          {uploading && (
            <div className="cm-upload-progress" style={{ marginTop: 8 }}>
              <div className="cm-upload-progress-bar" style={{ width: '100%' }} />
            </div>
          )}
        </div>
        {status && <div className={`cm-status ${status.type} cm-field-full`}>{status.msg}</div>}
        <div className="cm-field-full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="cm-save-topic-btn" style={{ width: 'auto', minWidth: 180 }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Overview'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CollegeMedia() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    axios.get(API, authHeader())
      .then(res => setTopics(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load topics'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (updated) =>
    setTopics(prev => prev.map(t => t.topic === updated.topic ? updated : t));

  const introTopic  = topics.find(t => t.topic === 'intro');
  const subDepts    = topics.filter(t => t.topic.startsWith('dept_'));
  const otherTopics = topics.filter(t =>
    t.topic !== 'intro' && t.topic !== 'dept' && !t.topic.startsWith('dept_')
  );

  if (loading) return (
    <Layout>
      <div className="cm-loading"><div className="cm-spinner" /><p>Loading college media...</p></div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="cm-loading"><p style={{ color: '#f87171' }}>❌ {error}</p></div>
    </Layout>
  );

  return (
    <Layout>
      <div className="college-media-page">

        {/* Header */}
        <div className="cm-header">
          <div className="cm-header-text">
            <h1>🏫 College Info Management</h1>
            <p>Manage photos &amp; videos shown to new visitors on WhatsApp</p>
          </div>
          <div className="cm-header-badge">📲 WhatsApp Bot — "About College" Flow</div>
        </div>

        {/* College Overview */}
        {introTopic && <IntroCard topic={introTopic} onUpdate={handleUpdate} />}

        {/* Departments — drill-down */}
        <p className="cm-section-title">🏛️ Departments</p>
        <DeptSection subDepts={subDepts} onUpdate={handleUpdate} />

        {/* Other Topics */}
        <p className="cm-section-title" style={{ marginTop: 36 }}>📋 Other College Topics</p>
        <div className="cm-topics-grid">
          {otherTopics.map(t => (
            <TopicCard key={t.topic} topic={t} onUpdate={handleUpdate} />
          ))}
        </div>

      </div>
    </Layout>
  );
}

export default CollegeMedia;
