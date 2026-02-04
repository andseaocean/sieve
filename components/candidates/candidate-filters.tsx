'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, X } from 'lucide-react';

interface FiltersState {
  category: string;
  source: string;
  minScore: string;
  maxScore: string;
  search: string;
  sortBy: string;
  sortOrder: string;
}

interface CandidateFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onApply: () => void;
  onClear: () => void;
}

export function CandidateFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: CandidateFiltersProps) {
  const updateFilter = (key: keyof FiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Фільтри</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label>Пошук</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ім'я або email..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Категорія AI</Label>
          <Select
            value={filters.category}
            onValueChange={(value) => updateFilter('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Всі категорії" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі категорії</SelectItem>
              <SelectItem value="top_tier">Топ кандидат</SelectItem>
              <SelectItem value="strong">Сильний</SelectItem>
              <SelectItem value="potential">Потенційний</SelectItem>
              <SelectItem value="not_fit">Не підходить</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label>Джерело</Label>
          <Select
            value={filters.source}
            onValueChange={(value) => updateFilter('source', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Всі джерела" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі джерела</SelectItem>
              <SelectItem value="warm">Warm (Форма)</SelectItem>
              <SelectItem value="cold">Cold (Sourcing)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Score range */}
        <div className="space-y-2">
          <Label>AI Score</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Від"
              min="1"
              max="10"
              value={filters.minScore}
              onChange={(e) => updateFilter('minScore', e.target.value)}
            />
            <Input
              type="number"
              placeholder="До"
              min="1"
              max="10"
              value={filters.maxScore}
              onChange={(e) => updateFilter('maxScore', e.target.value)}
            />
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label>Сортування</Label>
          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              onFiltersChange({ ...filters, sortBy, sortOrder });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Найновіші</SelectItem>
              <SelectItem value="created_at-asc">Найстаріші</SelectItem>
              <SelectItem value="ai_score-desc">Найвищий score</SelectItem>
              <SelectItem value="ai_score-asc">Найнижчий score</SelectItem>
              <SelectItem value="first_name-asc">Ім'я (А-Я)</SelectItem>
              <SelectItem value="first_name-desc">Ім'я (Я-А)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={onApply} className="flex-1">
            Застосувати
          </Button>
          <Button variant="outline" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
