import React, { useState, useEffect } from 'react';
import { userApi, M2CRole, UserM2CRoleSelection } from '../../services/userApi';
import './M2CRoleSelector.css';

interface M2CRoleSelectorProps {
  onSuccess?: () => void;
  className?: string;
}

const M2CRoleSelector: React.FC<M2CRoleSelectorProps> = ({ onSuccess, className = '' }) => {
  const [allRoles, setAllRoles] = useState<M2CRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rolesResponse, userRolesResponse] = await Promise.all([
        userApi.getAllM2CRoles(),
        userApi.getUserM2CRoles()
      ]);
      
      setAllRoles(rolesResponse || []);
      setSelectedRoleIds(userRolesResponse?.roleIds || []);
      setInitialSelectedIds(userRolesResponse?.roleIds || []);
    } catch (err: any) {
      console.error('Failed to load M2C roles:', err);
      setError('Fehler beim Laden der M2C-Rollen: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        if (prev.length >= 5) {
          setError('Maximal 5 Rollen können ausgewählt werden');
          return prev;
        }
        return [...prev, roleId];
      }
    });
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await userApi.updateUserM2CRoles(selectedRoleIds);
      setInitialSelectedIds([...selectedRoleIds]);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save M2C roles:', err);
      setError('Fehler beim Speichern: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedRoleIds([...initialSelectedIds]);
    setError(null);
    setSuccess(false);
  };

  const hasChanges = JSON.stringify(selectedRoleIds.sort()) !== JSON.stringify(initialSelectedIds.sort());

  if (loading) {
    return (
      <div className={`m2c-roles-selector ${className}`}>
        <h3>Meter-to-Cash Rollen</h3>
        <div className="loading-state">
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`m2c-roles-selector ${className}`}>
      <fieldset>
        <legend>
          <h3>Meter-to-Cash Rollen</h3>
        </legend>
        
        <p className="description">
          Wählen Sie die für Sie relevanten M2C-Rollen aus. Diese Informationen helfen dem KI-Assistenten, 
          passendere Antworten auf Ihre spezifischen Aufgaben und Perspektiven zu geben.
        </p>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            M2C-Rollen erfolgreich gespeichert!
          </div>
        )}

        <div className="roles-grid">
          {allRoles.map(role => (
            <div key={role.id} className="role-item">
              <label className="role-checkbox">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  disabled={saving}
                />
                <div className="role-content">
                  <span className="role-name">{role.role_name}</span>
                  <p className="role-description">{role.short_description}</p>
                </div>
              </label>
            </div>
          ))}
        </div>

        <div className="actions">
          <div className="action-buttons">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="btn btn-primary"
            >
              {saving ? 'Speichern...' : 'Änderungen speichern'}
            </button>
            
            {hasChanges && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="btn btn-secondary"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          
          <span className="selection-count">
            {selectedRoleIds.length} von 5 Rollen ausgewählt
          </span>
        </div>
      </fieldset>
    </div>
  );
};

export default M2CRoleSelector;
