import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Mail, Phone, Building } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Profile = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', phone: '', department: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authAPI.me();
      const u = response.data;
      setProfile({
        first_name: u.firstName || '',
        last_name: u.lastName || '',
        email: u.email || '',
        phone: u.phone || '',
        department: u.department || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updateProfile(profile);
      addToast('Profile updated successfully', 'success');
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (passwords.newPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword(passwords.currentPassword, passwords.newPassword);
      addToast('Password changed successfully', 'success');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your account information</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><User size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Personal Information</h3>
          </div>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input type="text" className="form-input" value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" className="form-input" value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={profile.email} disabled
                style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="text" className="form-input" value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input type="text" className="form-input" value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} /> Save Changes
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Lock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password (min 8 characters)</label>
              <input type="password" className="form-input" value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Lock size={16} /> Change Password
            </button>
          </form>

          <div style={{ marginTop: '30px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '8px', color: '#374151' }}>Account Info</h4>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Role: <strong>{user?.role}</strong></p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Email: <strong>{user?.email}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
