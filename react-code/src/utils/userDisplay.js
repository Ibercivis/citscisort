/**
 * Utility function to display user's name
 * Returns display_name if available, otherwise first_name + last_name, or email as fallback
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'Unknown';
  
  // Prefer display_name if available
  if (user.display_name) {
    return user.display_name;
  }
  
  // Fallback to first_name + last_name
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  
  return fullName || user.email || 'Unknown';
};

/**
 * Get initials for avatar display
 * Uses first letters of display_name, first_name + last_name, or email if names not available
 */
export const getUserInitials = (user) => {
  if (!user) return '??';
  
  // Try display_name first
  if (user.display_name) {
    const nameParts = user.display_name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return user.display_name.substring(0, 2).toUpperCase();
  }
  
  // Try first_name and last_name
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  
  // Fallback to email
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  
  return '??';
};
