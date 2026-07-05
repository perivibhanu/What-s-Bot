import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DeptLayout from '../components/DeptLayout';
import '../styles/CollegeMedia.css';

const API = 'https://what-s-bot.onrender.com/api/college-media';

const getTopicKey = (branch) => {
  const map = {
    'AIDS': 'dept_aids',
    'CSE': 'dept_cse',
    'ECE': 'dept_ece',
    'EEE': 'dept_ee',
    'IT': 'dept_it',
    'Mechanical': 'dept_mech',
    'Mechatronics': 'dept_mechatronics'
  };
  return map[branch] || `dept_${branch.toLowerCase()}`;
};

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// ─── Reusable upload / gallery body (used inside TopicCard) ───────────────────
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
      <div className="cm-desc-field">
        <label>Description (shown in WhatsApp)</label>
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder={`Brief description for ${topic.title} shown to visitors...`}
          rows={3}
        />
      </div>

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

      <input
        className="cm-caption-input"
        type="text"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Optional caption for next upload..."
      />

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

function DeptMedia() {
  const dept = localStorage.getItem('dept') || '';
  const topicKey = getTopicKey(dept);

  const [topic, setTopic] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [description, setDesc] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const [status, setStatus] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  
  const imageRef = useRef();
  const introVideoRef = useRef();

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey]);

  const fetchData = async () => {
    try {
      // 1. Fetch main topic
      const res = await axios.get(`${API}/${topicKey}`);
      setTopic(res.data);
      setIntroVideoUrl(res.data.introVideoUrl || '');
      setDesc(res.data.description || '');

      // 2. Fetch all topics to filter out the subtopics for this department
      const allRes = await axios.get(API);
      const subs = allRes.data.filter(t => t.topic.startsWith(`${topicKey}_`));
      setSubtopics(subs);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSubtopic = (updatedTopic) => {
    setSubtopics(prev => prev.map(t => t.topic === updatedTopic.topic ? updatedTopic : t));
  };

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/${topicKey}`, { description, introVideoUrl }, authHeader());
      setTopic(res.data);
      showStatus('✅ Department overview saved!');
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
      const res = await axios.post(`${API}/${topicKey}/upload`, fd, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTopic(res.data.topic);
      setIntroVideoUrl(res.data.topic.introVideoUrl);
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
      const res = await axios.post(`${API}/${topicKey}/upload`, fd, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTopic(res.data.topic);
      setCaption('');
      showStatus('✅ Department photo uploaded!');
    } catch (err) {
      showStatus('❌ ' + (err.response?.data?.error || 'Upload failed'), 'error');
    } finally { setUploading(false); }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Remove this photo?')) return;
    try {
      const res = await axios.delete(`${API}/${topicKey}/media/${mediaId}`, authHeader());
      setTopic(res.data.topic);
      showStatus('🗑️ Removed');
    } catch (err) {
      showStatus('❌ Delete failed', 'error');
    }
  };

  if (loading) {
    return (
      <DeptLayout>
        <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>
      </DeptLayout>
    );
  }

  const photos = topic?.mediaItems || [];

  return (
    <DeptLayout>
      <div className="college-media-container" style={{ padding: '0', background: 'transparent' }}>
        <div className="cm-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🎬</span> About {dept} Media
          </h1>
          <p>Manage photos & videos shown to students exploring the {dept} department on WhatsApp</p>
        </div>

        {status && (
          <div className="cm-status-toast" style={{
            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
          }}>
            {status.msg}
          </div>
        )}

        {/* MAIN DEPT OVERVIEW CARD */}
        <div className="cm-intro-card" style={{ marginBottom: '2rem' }}>
          <h2>🏛️ <span>Department Overview</span>
            <small style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '0.75rem', marginLeft: '10px' }}>
              — shown when a student selects the {dept} department
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
              <textarea value={description}
                onChange={e => setDesc(e.target.value)}
                placeholder={`Welcome to the ${dept} department! We focus on...`}
                style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', fontFamily: 'inherit' }} />
            </div>

            <div className="cm-field-group" style={{ gridColumn: '1 / -1' }}>
              <div className="cm-media-grid" style={{ marginBottom: '1rem' }}>
                <div className="cm-media-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ margin: 0 }}>DEPARTMENT PHOTOS ({photos.length} UPLOADED)</label>
                  {photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {photos.slice(0, 3).map((m, i) => (
                        <div key={m._id || i} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden' }}>
                          <img src={m.url} alt="campus" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => handleDeleteMedia(m._id)}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
                  placeholder="Optional photo caption..."
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                
                <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { handleUpload(e.target.files[0]); e.target.value = ''; }} />
                
                <button className="cm-upload-btn image" onClick={() => imageRef.current.click()} disabled={uploading}>
                  {uploading ? '⏳ Uploading...' : '📸 Upload Photo'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="cm-intro-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <button className="cm-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Overview'}
            </button>
          </div>
        </div>

        {/* SUBTOPICS */}
        <div className="cm-topics-list">
          <h2 style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            📋 {dept} Highlights
            <small style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '0.85rem', marginLeft: '10px' }}>
              — shown when a student clicks "More Options" in {dept}
            </small>
          </h2>
          <div className="cm-topics-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {subtopics.map(t => (
              <TopicCard key={t.topic} topic={t} onUpdate={updateSubtopic} />
            ))}
          </div>
        </div>

      </div>
    </DeptLayout>
  );
}

export default DeptMedia;
