export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface SessionContext {
  roomId: string;
  practiceId: string;
  providerId?: string;
  activePatientId?: string;
  deviceLocation?: string;
  conversationHistory: Message[];
  metadata: Record<string, any>;
}