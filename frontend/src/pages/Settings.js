import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import '../styles/Settings.css';

function Settings() {
  const [settings, setSettings] = useState({
    welcomeMessage: '',
    aboutMessage: '',
    aboutUrl: '',
    contactNumber: '',
    headerImageUrl: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://what-s-bot.onrender.com/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put('https://what-s-bot.onrender.com/api/admin/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings updated');
    } catch (err) {
      alert('Update failed');
    }
  };

  return (
    <Layout>
      <h1>Settings</h1>
      <form onSubmit={handleSubmit} className="settings-form">
        <label>Welcome Message</label>
        <textarea value={settings.welcomeMessage} onChange={(e) => setSettings({...settings, welcomeMessage: e.target.value})} />
        
        <label>About Message</label>
        <textarea value={settings.aboutMessage} onChange={(e) => setSettings({...settings, aboutMessage: e.target.value})} />
        
        <label>About URL</label>
        <input value={settings.aboutUrl} onChange={(e) => setSettings({...settings, aboutUrl: e.target.value})} />
        
        <label>Contact Number</label>
        <input value={settings.contactNumber} onChange={(e) => setSettings({...settings, contactNumber: e.target.value})} />
        
        <label>Header Image URL</label>
        <input value={settings.headerImageUrl} onChange={(e) => setSettings({...settings, headerImageUrl: e.target.value})} />
        
        <button type="submit">Save Settings</button>
      </form>
    </Layout>
  );
}

export default Settings;
