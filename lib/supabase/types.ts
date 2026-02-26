import type { ResumeData } from '@/lib/pdf/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Outreach-related types
export type OutreachStatus = 'pending' | 'scheduled' | 'sent' | 'responded' | 'declined' | 'cancelled';
export type OutreachQueueStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type ContactMethod = 'email' | 'telegram';
export type OutreachMessageType = 'intro' | 'test_task' | 'follow_up';
export type TestTaskStatus = 'not_sent' | 'scheduled' | 'sent' | 'submitted_on_time' | 'submitted_late' | 'evaluating' | 'evaluated' | 'approved' | 'rejected';
export type ConversationDirection = 'outbound' | 'inbound';
export type ConversationMessageType = 'outreach' | 'test_task' | 'candidate_response' | 'ai_reply' | 'deadline_extension_request' | 'deadline_extension_granted' | 'deadline_extension_denied' | 'test_task_decision' | 'questionnaire_sent' | 'questionnaire_submitted';
export type QuestionnaireStatus = 'sent' | 'in_progress' | 'completed' | 'expired' | 'skipped';
export type PipelineStage = 'new' | 'analyzed' | 'outreach_sent' | 'outreach_declined' | 'questionnaire_sent' | 'questionnaire_done' | 'test_sent' | 'test_done' | 'interview' | 'rejected' | 'hired';
export type AutomationActionType = 'send_outreach' | 'send_questionnaire' | 'send_test_task' | 'send_rejection' | 'send_invite';
export type AutomationQueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

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
          test_task_url: string | null;
          test_task_deadline_days: number;
          test_task_message: string | null;
          test_task_evaluation_criteria: string | null;
          job_description: string | null;
          questionnaire_competency_ids: string[];
          questionnaire_question_ids: string[];
          questionnaire_custom_questions: Json;
          outreach_template: string | null;
          outreach_template_approved: boolean;
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
          test_task_url?: string | null;
          test_task_deadline_days?: number;
          test_task_message?: string | null;
          test_task_evaluation_criteria?: string | null;
          job_description?: string | null;
          questionnaire_competency_ids?: string[];
          questionnaire_question_ids?: string[];
          questionnaire_custom_questions?: Json;
          outreach_template?: string | null;
          outreach_template_approved?: boolean;
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
          test_task_url?: string | null;
          test_task_deadline_days?: number;
          test_task_message?: string | null;
          test_task_evaluation_criteria?: string | null;
          job_description?: string | null;
          questionnaire_competency_ids?: string[];
          questionnaire_question_ids?: string[];
          questionnaire_custom_questions?: Json;
          outreach_template?: string | null;
          outreach_template_approved?: boolean;
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
          // Outreach fields
          telegram_username: string | null;
          telegram_chat_id: number | null;
          preferred_contact_methods: ContactMethod[] | null;
          outreach_status: OutreachStatus | null;
          outreach_sent_at: string | null;
          candidate_response: string | null;
          // Test task fields
          test_task_status: TestTaskStatus;
          test_task_sent_at: string | null;
          test_task_original_deadline: string | null;
          test_task_current_deadline: string | null;
          test_task_extensions_count: number;
          test_task_submitted_at: string | null;
          test_task_submission_text: string | null;
          test_task_candidate_feedback: string | null;
          test_task_ai_score: number | null;
          test_task_ai_evaluation: string | null;
          test_task_late_by_hours: number | null;
          resume_extracted_data: ResumeData | null;
          questionnaire_status: QuestionnaireStatus | null;
          pipeline_stage: PipelineStage;
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
          // Outreach fields
          telegram_username?: string | null;
          telegram_chat_id?: number | null;
          preferred_contact_methods?: ContactMethod[] | null;
          outreach_status?: OutreachStatus | null;
          outreach_sent_at?: string | null;
          candidate_response?: string | null;
          // Test task fields
          test_task_status?: TestTaskStatus;
          test_task_sent_at?: string | null;
          test_task_original_deadline?: string | null;
          test_task_current_deadline?: string | null;
          test_task_extensions_count?: number;
          test_task_submitted_at?: string | null;
          test_task_submission_text?: string | null;
          test_task_candidate_feedback?: string | null;
          test_task_ai_score?: number | null;
          test_task_ai_evaluation?: string | null;
          test_task_late_by_hours?: number | null;
          resume_extracted_data?: ResumeData | null;
          questionnaire_status?: QuestionnaireStatus | null;
          pipeline_stage?: PipelineStage;
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
          // Outreach fields
          telegram_username?: string | null;
          telegram_chat_id?: number | null;
          preferred_contact_methods?: ContactMethod[] | null;
          outreach_status?: OutreachStatus | null;
          outreach_sent_at?: string | null;
          candidate_response?: string | null;
          // Test task fields
          test_task_status?: TestTaskStatus;
          test_task_sent_at?: string | null;
          test_task_original_deadline?: string | null;
          test_task_current_deadline?: string | null;
          test_task_extensions_count?: number;
          test_task_submitted_at?: string | null;
          test_task_submission_text?: string | null;
          test_task_candidate_feedback?: string | null;
          test_task_ai_score?: number | null;
          test_task_ai_evaluation?: string | null;
          test_task_late_by_hours?: number | null;
          resume_extracted_data?: ResumeData | null;
          questionnaire_status?: QuestionnaireStatus | null;
          pipeline_stage?: PipelineStage;
        };
      };
      candidate_conversations: {
        Row: {
          id: string;
          candidate_id: string;
          direction: ConversationDirection;
          message_type: ConversationMessageType;
          content: string;
          metadata: Json;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          direction: ConversationDirection;
          message_type: ConversationMessageType;
          content: string;
          metadata?: Json;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          direction?: ConversationDirection;
          message_type?: ConversationMessageType;
          content?: string;
          metadata?: Json;
          sent_at?: string;
          created_at?: string;
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
          outreach_telegram_message_id: number | null;
          final_decision: 'invite' | 'reject' | null;
          final_decision_at: string | null;
          final_decision_by: string | null;
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
          outreach_telegram_message_id?: number | null;
          final_decision?: 'invite' | 'reject' | null;
          final_decision_at?: string | null;
          final_decision_by?: string | null;
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
          outreach_telegram_message_id?: number | null;
          final_decision?: 'invite' | 'reject' | null;
          final_decision_at?: string | null;
          final_decision_by?: string | null;
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
      outreach_queue: {
        Row: {
          id: string;
          candidate_id: string;
          request_id: string | null;
          intro_message: string;
          test_task_message: string | null;
          delivery_method: ContactMethod;
          scheduled_for: string;
          status: OutreachQueueStatus;
          error_message: string | null;
          retry_count: number;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
          edited_by: string | null;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          request_id?: string | null;
          intro_message: string;
          test_task_message?: string | null;
          delivery_method: ContactMethod;
          scheduled_for: string;
          status?: OutreachQueueStatus;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
          edited_by?: string | null;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          request_id?: string | null;
          intro_message?: string;
          test_task_message?: string | null;
          delivery_method?: ContactMethod;
          scheduled_for?: string;
          status?: OutreachQueueStatus;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
          edited_by?: string | null;
          edited_at?: string | null;
        };
      };
      outreach_messages: {
        Row: {
          id: string;
          candidate_id: string;
          request_id: string | null;
          message_type: OutreachMessageType;
          content: string;
          delivery_method: ContactMethod;
          sent_at: string;
          delivered_at: string | null;
          read_at: string | null;
          response: string | null;
          responded_at: string | null;
          external_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          request_id?: string | null;
          message_type: OutreachMessageType;
          content: string;
          delivery_method: ContactMethod;
          sent_at: string;
          delivered_at?: string | null;
          read_at?: string | null;
          response?: string | null;
          responded_at?: string | null;
          external_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          request_id?: string | null;
          message_type?: OutreachMessageType;
          content?: string;
          delivery_method?: ContactMethod;
          sent_at?: string;
          delivered_at?: string | null;
          read_at?: string | null;
          response?: string | null;
          responded_at?: string | null;
          external_message_id?: string | null;
          created_at?: string;
        };
      };
      soft_skill_competencies: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      questionnaire_questions: {
        Row: {
          id: string;
          competency_id: string;
          text: string;
          text_translations: Json;
          is_universal: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competency_id: string;
          text: string;
          text_translations?: Json;
          is_universal?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          competency_id?: string;
          text?: string;
          text_translations?: Json;
          is_universal?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      questionnaire_responses: {
        Row: {
          id: string;
          candidate_id: string;
          request_id: string;
          token: string;
          status: 'sent' | 'in_progress' | 'completed' | 'expired';
          questions: Json;
          answers: Json;
          ai_score: number | null;
          ai_evaluation: Json;
          sent_at: string;
          started_at: string | null;
          submitted_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          request_id: string;
          token: string;
          status?: 'sent' | 'in_progress' | 'completed' | 'expired';
          questions: Json;
          answers?: Json;
          ai_score?: number | null;
          ai_evaluation?: Json;
          sent_at?: string;
          started_at?: string | null;
          submitted_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          candidate_id?: string;
          request_id?: string;
          token?: string;
          status?: 'sent' | 'in_progress' | 'completed' | 'expired';
          questions?: Json;
          answers?: Json;
          ai_score?: number | null;
          ai_evaluation?: Json;
          sent_at?: string;
          started_at?: string | null;
          submitted_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      automation_queue: {
        Row: {
          id: string;
          action_type: AutomationActionType;
          candidate_id: string;
          request_id: string;
          scheduled_for: string;
          status: AutomationQueueStatus;
          payload: Json;
          error_message: string | null;
          retry_count: number;
          created_at: string;
          executed_at: string | null;
        };
        Insert: {
          id?: string;
          action_type: AutomationActionType;
          candidate_id: string;
          request_id: string;
          scheduled_for: string;
          status?: AutomationQueueStatus;
          payload?: Json;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          executed_at?: string | null;
        };
        Update: {
          id?: string;
          action_type?: AutomationActionType;
          candidate_id?: string;
          request_id?: string;
          scheduled_for?: string;
          status?: AutomationQueueStatus;
          payload?: Json;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          executed_at?: string | null;
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
export type OutreachQueue = Database['public']['Tables']['outreach_queue']['Row'];
export type OutreachMessage = Database['public']['Tables']['outreach_messages']['Row'];
export type CandidateConversation = Database['public']['Tables']['candidate_conversations']['Row'];

// Insert types
export type ManagerInsert = Database['public']['Tables']['managers']['Insert'];
export type RequestInsert = Database['public']['Tables']['requests']['Insert'];
export type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
export type CandidateRequestMatchInsert = Database['public']['Tables']['candidate_request_matches']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type OutreachQueueInsert = Database['public']['Tables']['outreach_queue']['Insert'];
export type OutreachMessageInsert = Database['public']['Tables']['outreach_messages']['Insert'];
export type CandidateConversationInsert = Database['public']['Tables']['candidate_conversations']['Insert'];

// Update types
export type ManagerUpdate = Database['public']['Tables']['managers']['Update'];
export type RequestUpdate = Database['public']['Tables']['requests']['Update'];
export type CandidateUpdate = Database['public']['Tables']['candidates']['Update'];
export type CandidateRequestMatchUpdate = Database['public']['Tables']['candidate_request_matches']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
export type OutreachQueueUpdate = Database['public']['Tables']['outreach_queue']['Update'];
export type OutreachMessageUpdate = Database['public']['Tables']['outreach_messages']['Update'];

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

// Questionnaire types
export type SoftSkillCompetency = Database['public']['Tables']['soft_skill_competencies']['Row'];
export type QuestionnaireQuestion = Database['public']['Tables']['questionnaire_questions']['Row'];
export type QuestionnaireResponse = Database['public']['Tables']['questionnaire_responses']['Row'];
export type SoftSkillCompetencyInsert = Database['public']['Tables']['soft_skill_competencies']['Insert'];
export type QuestionnaireQuestionInsert = Database['public']['Tables']['questionnaire_questions']['Insert'];
export type QuestionnaireResponseInsert = Database['public']['Tables']['questionnaire_responses']['Insert'];

// Questionnaire data interfaces
export interface QuestionnaireQuestionSnapshot {
  question_id: string;
  competency_id: string;
  competency_name: string;
  text: string;
}

export interface QuestionnaireAIEvaluation {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  per_competency: Array<{
    competency_id: string;
    competency_name: string;
    score: number;
    comment: string;
  }>;
}

// Automation queue types
export type AutomationQueue = Database['public']['Tables']['automation_queue']['Row'];
export type AutomationQueueInsert = Database['public']['Tables']['automation_queue']['Insert'];
export type AutomationQueueUpdate = Database['public']['Tables']['automation_queue']['Update'];
