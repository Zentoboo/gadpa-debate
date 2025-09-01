// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5076';
const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5076/debateHub';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  SIGNALR_HUB: SIGNALR_HUB_URL,
  ENDPOINTS: {
    // Public endpoints
    LIVE_DEBATES: `${API_BASE_URL}/debate/live-debates`,
    CURRENT_DEBATE: `${API_BASE_URL}/debate/current`,
    DEBATE_DETAILS: (id) => `${API_BASE_URL}/debate/${id}`,
    SUBMIT_QUESTION: (id) => `${API_BASE_URL}/debate/${id}/submit-question`,
    FIRE_REACTION: (id) => `${API_BASE_URL}/debate/${id}/fire`,
    HEATMAP_DATA: (id) => `${API_BASE_URL}/debate/${id}/heatmap-data`,
    USER_QUESTIONS_COUNT: (id) => `${API_BASE_URL}/debate/${id}/user-questions/count`,
    
    // Admin endpoints
    ADMIN: {
      REGISTER_STATUS: `${API_BASE_URL}/admin/register-status`,
      REGISTER: `${API_BASE_URL}/admin/register`,
      LOGIN: `${API_BASE_URL}/admin/login`,
      TOGGLE_REGISTER: `${API_BASE_URL}/admin/toggle-register`,
      LIVE_STATUS: `${API_BASE_URL}/admin/live/all-status`,
      BAN_IP: `${API_BASE_URL}/admin/ban-ip`,
      UNBAN_IP: `${API_BASE_URL}/admin/unban-ip`,
      BANNED_IPS: `${API_BASE_URL}/admin/banned-ips`,
      TOGGLE_DEBATE_MANAGER_REGISTER: `${API_BASE_URL}/admin/toggle-debate-manager-register`
    },
    
    // Debate Manager endpoints
    DEBATE_MANAGER: {
      REGISTER_STATUS: `${API_BASE_URL}/debate-manager/register-status`,
      REGISTER: `${API_BASE_URL}/debate-manager/register`,
      LOGIN: `${API_BASE_URL}/debate-manager/login`,
      DEBATES: `${API_BASE_URL}/debate-manager/debates`,
      DEBATE_DETAILS: (id) => `${API_BASE_URL}/debate-manager/debates/${id}`,
      UPDATE_DEBATE: (id) => `${API_BASE_URL}/debate-manager/debates/${id}`,
      DELETE_DEBATE: (id) => `${API_BASE_URL}/debate-manager/debates/${id}`,
      GO_LIVE: (id) => `${API_BASE_URL}/debate-manager/debates/${id}/go-live`,
      USER_QUESTIONS: (id) => `${API_BASE_URL}/debate-manager/debates/${id}/user-questions`,
      APPROVE_QUESTION: (debateId, questionId) => `${API_BASE_URL}/debate-manager/debates/${debateId}/user-questions/${questionId}/approve`,
      ADD_TO_ROUNDS: (debateId, questionId) => `${API_BASE_URL}/debate-manager/debates/${debateId}/user-questions/${questionId}/add-to-rounds`,
      LIVE: {
        STATUS: `${API_BASE_URL}/debate-manager/live/status`,
        END: `${API_BASE_URL}/debate-manager/live/end`,
        CHANGE_ROUND: `${API_BASE_URL}/debate-manager/live/change-round`,
        HEATMAP: `${API_BASE_URL}/debate-manager/live/heatmap`
      }
    },
    
    // Health check
    HEALTH: `${API_BASE_URL}/health`
  }
};

export default API_CONFIG;