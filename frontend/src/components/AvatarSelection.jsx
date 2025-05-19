import React, { useState } from 'react';
import '../styles/AvatarSelection.css';

const AvatarSelection = ({ onSelectAvatar, initialAvatar = 'avatar_sam' }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar);
  
  const avatars = [
    { id: 'avatar_john', name: 'John' },
    { id: 'avatar_sam', name: 'Sam' },
    { id: 'avatar_laura', name: 'Laura' }
  ];
  
  const handleAvatarSelect = (avatarId) => {
    setSelectedAvatar(avatarId);
    onSelectAvatar(avatarId);
  };
  
  return (
    <div className="avatar-selection-container">
      {avatars.map((avatar) => (
        <div 
          key={avatar.id}
          className={`avatar-option ${selectedAvatar === avatar.id ? 'active' : 'inactive'}`}
          onClick={() => handleAvatarSelect(avatar.id)}
          aria-label={`Select ${avatar.name} as instructor`}
          role="button"
        >
          <img 
            src={`../assets/${avatar.id}.jpg`} 
            alt={`${avatar.name} avatar`} 
            className="avatar-image"
          />
          <div className="avatar-name">{avatar.name}</div>
        </div>
      ))}
    </div>
  );
};

export default AvatarSelection;