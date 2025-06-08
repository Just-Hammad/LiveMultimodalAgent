import React, { useState } from 'react';
import '../styles/AvatarSelection.css';
// Import avatar images directly - this ensures Vite processes them correctly
import avatarJohn from '../../assets/avatar_john.jpg';
import avatarSam from '../../assets/avatar_sam.jpg';
import avatarLaura from '../../assets/avatar_laura.jpg';

const AvatarSelection = ({ onSelectAvatar, initialAvatar = 'avatar_sam' }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar);
  
  const avatars = [
    { id: 'avatar_john', name: 'Aaron on Color', src: avatarJohn },
    { id: 'avatar_sam', name: 'Kai on Composition', src: avatarSam },
    { id: 'avatar_laura', name: 'Laura on Line', src: avatarLaura }
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
            src={avatar.src} 
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