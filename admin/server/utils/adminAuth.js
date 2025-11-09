// utils/adminAuth.js
export const getAdminToken = () => {
  return localStorage.getItem('admin_token');
};

export const getAdminIdFromToken = () => {
  try {
    const token = getAdminToken();
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.adminId;
  } catch (error) {
    console.error('Error decoding admin token:', error);
    return null;
  }
};