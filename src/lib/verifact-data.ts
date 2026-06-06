// Type definitions only. All data is loaded from Supabase via the hooks in
// src/lib/hooks/. No mock arrays remain.

export type RiskLevel = "low" | "moderate" | "high";
export type PatientStatus = "Stable" | "Needs Review" | "Urgent";

export interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string | null;
  conditions: string[];
  riskScore: number;
  status: PatientStatus;
  createdAt: string | null;
}

export interface TriageResult {
  id: string;
  patientId: string;
  summary: string;
  reasoning: string;
  severity: RiskLevel;
  createdAt: string;
}

export interface VoiceNote {
  id: string;
  patientId: string;
  transcript: string | null;
  audioUrl: string | null;
}

export interface PrescriptionRow {
  id: string;
  patientId: string;
  doctorId: string | null;
  status: string | null;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export type ConversationStatus = "open" | "resolved";
export type SenderType = "doctor" | "patient";

export interface Conversation {
  id: string;
  patientId: string;
  doctorId: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  // Joined from patients table
  patientName: string;
  riskScore: number;
  // Derived
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function statusFromScore(score: number): PatientStatus {
  if (score >= 75) return "Urgent";
  if (score >= 50) return "Needs Review";
  return "Stable";
}

export function severityFromScore(score: number): RiskLevel {
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  return "low";
}
