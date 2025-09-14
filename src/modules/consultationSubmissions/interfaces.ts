export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface ConsultationSubmission {
  _id?: any; // ObjectId
  slug: string; // consultation slug, e.g., 'mitteilung-53'
  chapterKey: string; // chapter identifier
  author?: string; // optional display name
  organization?: string; // optional org
  contact?: string; // email/phone - NEVER expose publicly
  comment: string; // the actual feedback text
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  status: SubmissionStatus; // workflow status, default 'pending'
  published: boolean; // whether publicly visible
  curatedSummary?: string; // admin curated short summary (optional)
  curatedOpinion?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral' | null; // optional admin opinion
}

export interface PublicSubmissionDTO {
  id: string;
  slug: string;
  chapterKey: string;
  author?: string;
  organization?: string;
  comment: string;
  createdAt: string;
  curatedSummary?: string;
  curatedOpinion?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral' | null;
}
