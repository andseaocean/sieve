export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      managers: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string;
          role: 'admin' | 'manager';
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name: string;
          role?: 'admin' | 'manager';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          role?: 'admin' | 'manager';
          created_at?: string;
        };
      };
      requests: {
        Row: {
          id: string;
          manager_id: string | null;
          title: string;
          description: string | null;
          required_skills: string;
          nice_to_have_skills: string | null;
          soft_skills: string;
          ai_orientation: 'critical' | 'preferred' | 'not_important' | null;
          red_flags: string | null;
          location: string | null;
          employment_type: 'full-time' | 'part-time' | 'contract' | 'not_specified' | null;
          remote_policy: 'remote' | 'hybrid' | 'office' | 'not_specified' | null;
          priority: 'high' | 'medium' | 'low';
          status: 'active' | 'paused' | 'closed';
          qualification_questions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manager_id?: string | null;
          title: string;
          description?: string | null;
          required_skills: string;
          nice_to_have_skills?: string | null;
          soft_skills: string;
          ai_orientation?: 'critical' | 'preferred' | 'not_important' | null;
          red_flags?: string | null;
          location?: string | null;
          employment_type?: 'full-time' | 'part-time' | 'contract' | 'not_specified' | null;
          remote_policy?: 'remote' | 'hybrid' | 'office' | 'not_specified' | null;
          priority?: 'high' | 'medium' | 'low';
          status?: 'active' | 'paused' | 'closed';
          qualification_questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          manager_id?: string | null;
          title?: string;
          description?: string | null;
          required_skills?: string;
          nice_to_have_skills?: string | null;
          soft_skills?: string;
          ai_orientation?: 'critical' | 'preferred' | 'not_important' | null;
          red_flags?: string | null;
          location?: string | null;
          employment_type?: 'full-time' | 'part-time' | 'contract' | 'not_specified' | null;
          remote_policy?: 'remote' | 'hybrid' | 'office' | 'not_specified' | null;
          priority?: 'high' | 'medium' | 'low';
          status?: 'active' | 'paused' | 'closed';
          qualification_questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      candidates: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          linkedin_url: string | null;
          portfolio_url: string | null;
          resume_url: string | null;
          about_text: string | null;
          why_vamos: string | null;
          key_skills: string[] | null;
          qualification_answers: Json;
          source: 'warm' | 'cold';
          ai_score: number | null;
          ai_category: 'top_tier' | 'strong' | 'potential' | 'not_fit' | null;
          ai_summary: string | null;
          ai_strengths: string[] | null;
          ai_concerns: string[] | null;
          ai_recommendation: 'yes' | 'no' | null;
          ai_reasoning: string | null;
          created_at: string;
          // Sourcing fields
          sourcing_method: 'form' | 'quick_check' | 'auto_search' | 'referral' | 'manual' | null;
          profile_url: string | null;
          platform: 'linkedin' | 'dou' | 'djinni' | 'workua' | 'github' | 'other' | null;
          current_position: string | null;
          location: string | null;
          experience_years: number | null;
          outreach_message: string | null;
          // Language and translation fields
          original_language: 'uk' | 'en' | 'tr' | 'es' | null;
          translated_to: 'uk' | 'en' | 'tr' | 'es' | null;
          about_text_translated: string | null;
          why_vamos_translated: string | null;
          key_skills_translated: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          resume_url?: string | null;
          about_text?: string | null;
          why_vamos?: string | null;
          key_skills?: string[] | null;
          qualification_answers?: Json;
          source?: 'warm' | 'cold';
          ai_score?: number | null;
          ai_category?: 'top_tier' | 'strong' | 'potential' | 'not_fit' | null;
          ai_summary?: string | null;
          ai_strengths?: string[] | null;
          ai_concerns?: string[] | null;
          ai_recommendation?: 'yes' | 'no' | null;
          ai_reasoning?: string | null;
          created_at?: string;
          // Sourcing fields
          sourcing_method?: 'form' | 'quick_check' | 'auto_search' | 'referral' | 'manual' | null;
          profile_url?: string | null;
          platform?: 'linkedin' | 'dou' | 'djinni' | 'workua' | 'github' | 'other' | null;
          current_position?: string | null;
          location?: string | null;
          experience_years?: number | null;
          outreach_message?: string | null;
          // Language and translation fields
          original_language?: 'uk' | 'en' | 'tr' | 'es' | null;
          translated_to?: 'uk' | 'en' | 'tr' | 'es' | null;
          about_text_translated?: string | null;
          why_vamos_translated?: string | null;
          key_skills_translated?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          resume_url?: string | null;
          about_text?: string | null;
          why_vamos?: string | null;
          key_skills?: string[] | null;
          qualification_answers?: Json;
          source?: 'warm' | 'cold';
          ai_score?: number | null;
          ai_category?: 'top_tier' | 'strong' | 'potential' | 'not_fit' | null;
          ai_summary?: string | null;
          ai_strengths?: string[] | null;
          ai_concerns?: string[] | null;
          ai_recommendation?: 'yes' | 'no' | null;
          ai_reasoning?: string | null;
          created_at?: string;
          // Sourcing fields
          sourcing_method?: 'form' | 'quick_check' | 'auto_search' | 'referral' | 'manual' | null;
          profile_url?: string | null;
          platform?: 'linkedin' | 'dou' | 'djinni' | 'workua' | 'github' | 'other' | null;
          current_position?: string | null;
          location?: string | null;
          experience_years?: number | null;
          outreach_message?: string | null;
          // Language and translation fields
          original_language?: 'uk' | 'en' | 'tr' | 'es' | null;
          translated_to?: 'uk' | 'en' | 'tr' | 'es' | null;
          about_text_translated?: string | null;
          why_vamos_translated?: string | null;
          key_skills_translated?: string | null;
        };
      };
      candidate_request_matches: {
        Row: {
          id: string;
          candidate_id: string | null;
          request_id: string | null;
          match_score: number | null;
          match_explanation: string | null;
          status: 'new' | 'reviewed' | 'interview' | 'hired' | 'rejected' | 'on_hold';
          manager_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id?: string | null;
          request_id?: string | null;
          match_score?: number | null;
          match_explanation?: string | null;
          status?: 'new' | 'reviewed' | 'interview' | 'hired' | 'rejected' | 'on_hold';
          manager_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string | null;
          request_id?: string | null;
          match_score?: number | null;
          match_explanation?: string | null;
          status?: 'new' | 'reviewed' | 'interview' | 'hired' | 'rejected' | 'on_hold';
          manager_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          candidate_id: string | null;
          manager_id: string | null;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id?: string | null;
          manager_id?: string | null;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string | null;
          manager_id?: string | null;
          text?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier usage
export type Manager = Database['public']['Tables']['managers']['Row'];
export type Request = Database['public']['Tables']['requests']['Row'];
export type Candidate = Database['public']['Tables']['candidates']['Row'];
export type CandidateRequestMatch = Database['public']['Tables']['candidate_request_matches']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];

// Insert types
export type ManagerInsert = Database['public']['Tables']['managers']['Insert'];
export type RequestInsert = Database['public']['Tables']['requests']['Insert'];
export type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
export type CandidateRequestMatchInsert = Database['public']['Tables']['candidate_request_matches']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];

// Update types
export type ManagerUpdate = Database['public']['Tables']['managers']['Update'];
export type RequestUpdate = Database['public']['Tables']['requests']['Update'];
export type CandidateUpdate = Database['public']['Tables']['candidates']['Update'];
export type CandidateRequestMatchUpdate = Database['public']['Tables']['candidate_request_matches']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];

// Enum types for better type safety
export type ManagerRole = 'admin' | 'manager';
export type AIOrientation = 'critical' | 'preferred' | 'not_important';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'not_specified';
export type RemotePolicy = 'remote' | 'hybrid' | 'office' | 'not_specified';
export type RequestPriority = 'high' | 'medium' | 'low';
export type RequestStatus = 'active' | 'paused' | 'closed';
export type CandidateSource = 'warm' | 'cold';
export type AICategory = 'top_tier' | 'strong' | 'potential' | 'not_fit';
export type MatchStatus = 'new' | 'reviewed' | 'interview' | 'hired' | 'rejected' | 'on_hold';
export type SourcingMethod = 'form' | 'quick_check' | 'auto_search' | 'referral' | 'manual';
export type Platform = 'linkedin' | 'dou' | 'djinni' | 'workua' | 'github' | 'other';
export type SupportedLanguage = 'uk' | 'en' | 'tr' | 'es';
