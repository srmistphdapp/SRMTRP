import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const researchCoordinatorAPI = {
  getScholars: () => 
    apiClient.get('/scholars'),
  
  forwardToDepartments: (data) => 
    apiClient.post('/research-coordinator/forward-to-departments', data),
  
  getDepartmentReviews: () => 
    apiClient.get('/research-coordinator/department-reviews'),
  
  verifyScholars: (data) => 
    apiClient.post('/research-coordinator/verify-scholars', data),
  
  forwardToAdmin: (data) => 
    apiClient.post('/research-coordinator/forward-to-admin', data)
};

export default apiClient;
