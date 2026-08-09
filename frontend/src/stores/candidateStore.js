import { defineStore } from 'pinia';
import { candidateApi } from '@/api/candidateApi';

export const useCandidateStore = defineStore('candidate', {
  state: () => ({
    searchFilters: {
      keyword: '',
      city: '',
      degreeType: '',
      minWorkYears: null,
      maxWorkYears: null,
      company: '',
    },
    candidateList: [],
    totalCount: 0,
    databaseTotalCount: 0,
    loading: false,
    currentCandidateId: null,
    currentCandidateDetail: null,
    detailDrawerVisible: false,
    detailLoading: false,
  }),

  actions: {
    async fetchCandidates() {
      this.loading = true;
      try {
        const res = await candidateApi.searchCandidates(this.searchFilters);
        this.candidateList = res.items || [];
        this.totalCount = res.total || 0;
      } catch (err) {
        console.error('Failed to fetch candidates:', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchDatabaseTotalCount() {
      try {
        const count = await candidateApi.getCandidateCount();
        this.databaseTotalCount = count;
      } catch (err) {
        console.error('Failed to fetch DB candidate count:', err);
      }
    },

    async openCandidateDetail(candidateId) {
      this.currentCandidateId = candidateId;
      this.detailDrawerVisible = true;
      this.detailLoading = true;
      try {
        const detail = await candidateApi.getCandidateDetail(candidateId);
        this.currentCandidateDetail = detail;
      } catch (err) {
        console.error('Failed to fetch candidate detail:', err);
      } finally {
        this.detailLoading = false;
      }
    },

    closeCandidateDetail() {
      this.detailDrawerVisible = false;
      this.currentCandidateId = null;
      this.currentCandidateDetail = null;
    },

    resetFilters() {
      this.searchFilters = {
        keyword: '',
        city: '',
        degreeType: '',
        minWorkYears: null,
        maxWorkYears: null,
        company: '',
      };
      this.fetchCandidates();
    },
  },
});
