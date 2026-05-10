export enum GenerationMode {
  STANDARD = "STANDARD",
  OPTIMIZE = "OPTIMIZE",
}

export enum GenerationStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export interface Generation {
  id: string;
  userId: string;
  campusId: string;
  mode: GenerationMode;
  sceneType: string;
  inputData: Record<string, unknown>;
  uploadedImages: string[];
  resultImageUrl: string | null;
  cost: number;
  modelUsed: string;
  status: GenerationStatus;
  errorMessage: string | null;
  promptVersion: string;
  templateId: string;
  createdAt: string;
}

export interface CreateGenerationInput {
  userId: string;
  campusId: string;
  mode: GenerationMode;
  sceneType: string;
  inputData: Record<string, unknown>;
  uploadedImages: string[];
  cost: number;
  modelUsed: string;
  promptVersion: string;
  templateId: string;
}

export interface UpdateGenerationStatusInput {
  generationId: string;
  status: GenerationStatus;
  resultImageUrl?: string;
  errorMessage?: string;
}
