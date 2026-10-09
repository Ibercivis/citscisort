import api from './api';

const metaAspectSuggestionService = {
  search: (query) =>
    api.get('/api/meta-aspect-suggestions/', { params: { search: query } }).then(r => r.data),
};

export default metaAspectSuggestionService;
