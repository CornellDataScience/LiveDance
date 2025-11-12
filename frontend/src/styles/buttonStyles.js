/**
 * Shared button styles for consistent UI across components
 */

export const headerButtonStyle = {
  padding: '6px 12px',
  fontSize: '12px',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'background 0.2s'
};

export const getHeaderButtonBackground = (isActive, activeColor = '#38a169', inactiveColor = '#667eea') => {
  return isActive ? activeColor : inactiveColor;
};

