import api from './api';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../config/legal';

const legalService = {
  getStatus: () =>
    api.get('/api/auth/legal-status/').then(r => r.data),

  accept: () =>
    api.post('/api/auth/accept-legal/', {
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
    }).then(r => r.data),
};

export default legalService;
