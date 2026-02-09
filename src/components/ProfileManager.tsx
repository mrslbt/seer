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
  onClose: () => void;
}

export function ProfileManager({
  profiles, activeProfileId, onSwitch, onAddNew, onDelete, onClose
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
