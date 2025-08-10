import React, { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
import { M2CRoleSelector } from '../components/Profile';

interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  company?: string;
  role: string;
}

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await userApi.getUserProfile();
      setUser(userData);
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      setError('Fehler beim Laden des Profils: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  };

  const handleM2CRolesSaved = () => {
    // Optionally reload user profile to get updated role information
    console.log('M2C roles saved successfully');
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <h1>Profil</h1>
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="container">
          <h1>Profil</h1>
          <div className="alert alert-error">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>Profil</h1>
        
        <div className="profile-section">
          <h2>Benutzerdaten</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>E-Mail:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>Name:</label>
              <span>{user?.name}</span>
            </div>
            {user?.full_name && (
              <div className="info-item">
                <label>Vollständiger Name:</label>
                <span>{user.full_name}</span>
              </div>
            )}
            {user?.company && (
              <div className="info-item">
                <label>Unternehmen:</label>
                <span>{user.company}</span>
              </div>
            )}
            <div className="info-item">
              <label>Rolle:</label>
              <span>{user?.role}</span>
            </div>
          </div>
        </div>

        {/* M2C Roles Section - only show if feature is enabled */}
        {process.env.REACT_APP_ENABLE_M2C_ROLES === 'true' && (
          <div className="profile-section">
            <M2CRoleSelector 
              onSuccess={handleM2CRolesSaved}
              className="m2c-roles-section"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
