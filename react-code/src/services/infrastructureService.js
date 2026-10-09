import api from './api';

const infrastructureService = {
  search: (query) =>
    api.get('/api/infrastructures/', { params: { search: query } }).then(r => r.data),
};

export default infrastructureService;
