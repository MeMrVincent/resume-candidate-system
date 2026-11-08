class CandidateSearchService {
  constructor(searchRepository) {
    this.searchRepository = searchRepository;
  }

  candidatesSearch(params) {
    return this.searchRepository.candidatesSearch(params || {});
  }
}

module.exports = CandidateSearchService;
