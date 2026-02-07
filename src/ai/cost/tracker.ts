// Stub usage tracker - Phase 2 functionality
export const usageTracker = {
  async getUsage(orgId: string, period: string): Promise<{ totalTokens: number }> {
    return { totalTokens: 0 }
  },
  
  async track(orgId: string, promptTokens: number, completionTokens: number): Promise<void> {
    // Stub implementation
  }
}
