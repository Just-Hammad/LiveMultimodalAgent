import React from 'react';
import './NeumorphicButton.css';

const NeumorphicButton = ({
  icon,
  label,
  onClick,
  size = 'medium', // small, medium, large
  shape = 'circle', // circle, square, pill
  disabled = false,
  active = false,
  className = '',
  children,
  ...props
}) => {
  // Maps aligned with the reference design
  const sizeMap = {
    small: '48px',
    medium: '60px', // Reference design uses 60px
    large: '70px',
  };
  
  const shapeMap = {
    circle: '50%', // Fully rounded for circles
    square: '12px', // Slightly rounded corners
    pill: '50px',
  };
  
  // Generate CSS class names that match reference design
  const shapeClassName = shape === 'circle' ? 'btn-round' : 'btn-square';
  
  const buttonStyle = {
    width: sizeMap[size],
    height: shape === 'pill' ? '32px' : sizeMap[size],
    borderRadius: shapeMap[shape],
  };
  
  return (
    <button 
      className={`neumorphic-button ${shapeClassName} ${active ? 'active' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={disabled ? null : onClick}
      style={buttonStyle}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {label && <span className="button-label">{label}</span>}
      {children}
    </button>
  );
};

export default NeumorphicButton;
