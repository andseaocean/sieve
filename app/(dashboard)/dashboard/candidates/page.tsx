'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/header';
import { CandidateCard } from '@/components/candidates/candidate-card';
import { CandidateFilters } from '@/components/candidates/candidate-filters';
import { Candidate } from '@/lib/supabase/types';
import { Users } from 'lucide-react';

interface FiltersState {
  category: string;
  source: string;
  minScore: string;
  maxScore: string;
  search: string;
  sortBy: string;
  sortOrder: string;
}

const defaultFilters: FiltersState = {
  category: 'all',
  source: 'all',
  minScore: '',
  maxScore: '',
  search: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.source !== 'all') params.set('source', filters.source);
      if (filters.minScore) params.set('minScore', filters.minScore);
      if (filters.maxScore) params.set('maxScore', filters.maxScore);
      if (filters.search) params.set('search', filters.search);
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/candidates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Candidates" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          <div className="w-72 flex-shrink-0">
            <CandidateFilters
              filters={filters}
              onFiltersChange={setFilters}
              onApply={fetchCandidates}
              onClear={handleClearFilters}
            />
          </div>

          {/* Candidates list */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Завантаження...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="p-4 rounded-full bg-gray-100">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium">Немає кандидатів</h3>
                  <p className="text-muted-foreground">
                    Спробуйте змінити фільтри або додайте кандидатів
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Знайдено: {candidates.length} кандидатів
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {candidates.map((candidate) => (
                    <CandidateCard key={candidate.id} candidate={candidate} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
