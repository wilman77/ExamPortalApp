export type User = { id: string; name: string; email: string; role: 'teacher' | 'student' };
export type ExamSummary = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  date: string;
  duration: number;
  status: 'published';
  questionCount: number;
  attempt: { id: string; status: 'in_progress' | 'submitted' | 'expired'; score: number | null } | null;
};
export type AttemptQuestion = { id: number; prompt: string; options: string[] };
export type ReviewQuestion = AttemptQuestion & { answer: number; explanation: string; selectedAnswer: number | null; correct: boolean };
export type ExamInfo = Pick<ExamSummary, 'id' | 'title' | 'subject' | 'grade' | 'date' | 'duration'>;
export type Attempt = {
  id: string;
  status: 'in_progress' | 'submitted';
  startedAt: number;
  expiresAt: number;
  submittedAt?: number;
  answers: Record<number, number>;
  exam: ExamInfo;
  questions: AttemptQuestion[] | ReviewQuestion[];
  result?: { score: number; questionCount: number; correctCount: number; percentage: number; review: ReviewQuestion[] };
};

const baseUrl = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'X-Exam-Role': 'student', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Permintaan gagal (${response.status}).`);
  return body;
}

export const api = {
  async me() { return request<{ user: User | null }>('/auth/me'); },
  async login(email: string, password: string) {
    return request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role: 'student' }) });
  },
  async register(name: string, email: string, password: string) {
    return request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role: 'student' }) });
  },
  async logout() { return request<{ ok: boolean }>('/auth/logout', { method: 'POST', body: '{}' }); },
  async exams() { return request<{ exams: ExamSummary[] }>('/exams'); },
  async startAttempt(examId: string) {
    return request<{ attempt: Attempt }>(`/exams/${encodeURIComponent(examId)}/attempts`, { method: 'POST', body: '{}' });
  },
  async getAttempt(attemptId: string) { return request<{ attempt: Attempt }>(`/attempts/${encodeURIComponent(attemptId)}`); },
  async saveAnswers(attemptId: string, answers: Record<number, number>) {
    return request<{ ok: boolean; savedAt: number }>(`/attempts/${encodeURIComponent(attemptId)}/answers`, { method: 'PUT', body: JSON.stringify({ answers }) });
  },
  async submitAttempt(attemptId: string, answers: Record<number, number>) {
    return request<{ attempt: Attempt }>(`/attempts/${encodeURIComponent(attemptId)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
  },
};
