import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to locale string
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('uk-UA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Get initials from name
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Score to color mapping for AI scores (1-10)
export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  if (score >= 4) return 'text-orange-600';
  return 'text-red-600';
}

// Match score color (0-100)
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

// Match score background
export function getMatchScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-yellow-100';
  if (score >= 40) return 'bg-orange-100';
  return 'bg-red-100';
}

// Category badge colors
export const categoryColors: Record<string, string> = {
  top_tier: 'bg-red-100 text-red-800 border-red-300',
  strong: 'bg-green-100 text-green-800 border-green-300',
  potential: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  not_fit: 'bg-gray-100 text-gray-800 border-gray-300',
};

// Status badge colors
export const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-800 border-gray-300',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-300',
  interview: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  hired: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-300',
};

// Request status colors
export const requestStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  closed: 'bg-gray-100 text-gray-800 border-gray-300',
};

// Priority colors
export const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-gray-100 text-gray-800 border-gray-300',
};

// Category labels (Ukrainian)
export const categoryLabels: Record<string, string> = {
  top_tier: 'Топ кандидат',
  strong: 'Сильний',
  potential: 'Потенційний',
  not_fit: 'Не підходить',
};

// Status labels (Ukrainian)
export const statusLabels: Record<string, string> = {
  new: 'Новий',
  reviewed: 'Переглянуто',
  interview: 'Інтерв\'ю',
  hired: 'Найнято',
  rejected: 'Відхилено',
  on_hold: 'На паузі',
};

// Request status labels (Ukrainian)
export const requestStatusLabels: Record<string, string> = {
  active: 'Активний',
  paused: 'Призупинено',
  closed: 'Закрито',
};

// Priority labels (Ukrainian)
export const priorityLabels: Record<string, string> = {
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький',
};

// AI Orientation labels (Ukrainian)
export const aiOrientationLabels: Record<string, string> = {
  critical: 'Критично важливо',
  preferred: 'Бажано',
  not_important: 'Не важливо',
};

// Employment type labels (Ukrainian)
export const employmentTypeLabels: Record<string, string> = {
  'full-time': 'Повна зайнятість',
  'part-time': 'Часткова зайнятість',
  contract: 'Контракт',
  not_specified: 'Не вказано',
};

// Remote policy labels (Ukrainian)
export const remotePolicyLabels: Record<string, string> = {
  remote: 'Віддалено',
  hybrid: 'Гібрид',
  office: 'Офіс',
  not_specified: 'Не вказано',
};
