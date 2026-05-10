export interface DailyRecommendation {
  id: string;
  date: string;
  topTitle: string;
  topDescription: string;
  topSceneType: string;
  topPrefill: Record<string, unknown>;
  bottomTitle: string;
  bottomDescription: string;
  bottomSceneType: string;
  bottomPrefill: Record<string, unknown>;
  createdAt: string;
}

export interface CreateDailyRecommendationInput {
  date: string;
  topTitle: string;
  topDescription: string;
  topSceneType: string;
  topPrefill: Record<string, unknown>;
  bottomTitle: string;
  bottomDescription: string;
  bottomSceneType: string;
  bottomPrefill: Record<string, unknown>;
}
