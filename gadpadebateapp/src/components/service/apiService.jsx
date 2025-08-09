const API_BASE_URL = 'https://localhost:5076'; // backend URL

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Helper method to get headers
  getHeaders(includeAuth = false) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Helper method for API calls
  async apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(options.requireAuth),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Set token (after login)
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear token (logout)
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // ============= PUBLIC ENDPOINTS =============

  // Add fire emoji
  async addFire() {
    return this.apiCall('/debate/fire', {
      method: 'POST',
    });
  }

  // Get heatmap total
  async getHeatmap() {
    return this.apiCall('/debate/heatmap', {
      method: 'GET',
    });
  }

  // ============= AUTH ENDPOINTS =============

  // Admin registration
  async register(username, password) {
    return this.apiCall('/admin/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Admin login
  async login(username, password) {
    const response = await this.apiCall('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  // Logout
  logout() {
    this.clearToken();
  }

  // ============= ADMIN ENDPOINTS =============

  // Get admin heatmap
  async getAdminHeatmap() {
    return this.apiCall('/admin/heatmap', {
      method: 'GET',
      requireAuth: true,
    });
  }

  // Reset heatmap
  async resetHeatmap() {
    return this.apiCall('/admin/reset', {
      method: 'POST',
      requireAuth: true,
    });
  }

  // Toggle registration
  async toggleRegistration(enabled) {
    return this.apiCall(`/admin/toggle-registration?enabled=${enabled}`, {
      method: 'POST',
      requireAuth: true,
    });
  }

  // Get registration status
  async getRegistrationStatus() {
    return this.apiCall('/admin/registration-status', {
      method: 'GET',
      requireAuth: true,
    });
  }

  // Ban IP
  async banIp(ip) {
    return this.apiCall(`/admin/ban-ip?ip=${encodeURIComponent(ip)}`, {
      method: 'POST',
      requireAuth: true,
    });
  }

  // Unban IP
  async unbanIp(ip) {
    return this.apiCall(`/admin/unban-ip?ip=${encodeURIComponent(ip)}`, {
      method: 'POST',
      requireAuth: true,
    });
  }

  // Get banned IPs
  async getBannedIps() {
    return this.apiCall('/admin/banned-ips', {
      method: 'GET',
      requireAuth: true,
    });
  }
}

export default new ApiService();