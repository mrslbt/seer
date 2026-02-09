import { useCallback } from 'react';
import type { UserProfile } from '../types/userProfile';
import { playClick } from '../lib/sounds';
import './ProfileManager.css';

interface ProfileManagerProps {
  profiles: UserProfile[];
  activeProfileId: string | null;
  onSwitch: (profileId: string) => void;
  onAddNew: () => void;
  onDelete: (profileId: string) => void;
  onEdit: (profileId: string) => void;
  onClose: () => void;
}

export function ProfileManager({
  profiles, activeProfileId, onSwitch, onAddNew, onDelete, onEdit, onClose
}: ProfileManagerProps) {

  const handleSwitch = useCallback((profileId: string) => {
    if (profileId === activeProfileId) return;
    playClick();
    onSwitch(profileId);
    onClose();
  }, [activeProfileId, onSwitch, onClose]);

  const handleDelete = useCallback((e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    playClick();
    onDelete(profileId);
  }, [onDelete]);

  const handleEdit = useCallback((e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    playClick();
    onEdit(profileId);
  }, [onEdit]);

  const handleAdd = useCallback(() => {
    playClick();
    onAddNew();
  }, [onAddNew]);

  return (
    <div className="profile-manager">
      <div className="profile-list">
        {profiles.map(profile => {
          const isActive = profile.id === activeProfileId;
          const sunSign = profile.natalChart.sun.sign;

          return (
            <button
              key={profile.id}
              className={`profile-item ${isActive ? 'profile-item--active' : ''}`}
              onClick={() => handleSwitch(profile.id)}
            >
              <div className="profile-item-left">
                <span className={`profile-dot ${isActive ? 'profile-dot--active' : ''}`} />
                <span className="profile-name">{profile.birthData.name}</span>
              </div>
              <div className="profile-item-right">
                <span className="profile-sign">{sunSign}</span>
                {isActive && (
                  <button
                    className="profile-edit"
                    onClick={(e) => handleEdit(e, profile.id)}
                    aria-label={`Edit ${profile.birthData.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                  </button>
                )}
                {!isActive && (
                  <button
                    className="profile-delete"
                    onClick={(e) => handleDelete(e, profile.id)}
                    aria-label={`Delete ${profile.birthData.name}`}
                  >
                    {'\u00D7'}
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button className="profile-add-btn" onClick={handleAdd}>
        + Add Profile
      </button>
    </div>
  );
}
