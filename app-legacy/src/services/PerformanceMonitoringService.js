/**
 * Performance Monitoring Service for the React Legacy App
 * 
 * This service tracks and analyzes performance metrics for the chat system
 * to identify bottlenecks and opportunities for optimization.
 */

class PerformanceMonitoringService {
  static metrics = {
    history: [],
    averages: {
      queryAnalysisTime: 0,
      embeddingGenerationTime: 0,
      hydeGenerationTime: 0,
      searchTime: 0,
      contextExtractionTime: 0,
      llmGenerationTime: 0,
      totalResponseTime: 0
    }
  };

  /**
   * Record metrics for a chat interaction
   * @param {Object} metrics Timing metrics for various operations
   */
  static recordMetrics(metrics) {
    // Add timestamp
    const metricEntry = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    // Add to history (keep only last 100 entries)
    this.metrics.history.unshift(metricEntry);
    if (this.metrics.history.length > 100) {
      this.metrics.history.pop();
    }

    // Update averages
    this.updateAverages();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metrics:', metricEntry);
      console.log('Updated averages:', this.metrics.averages);
    }

    // Optionally send to analytics service
    this.sendToAnalytics(metricEntry);
  }

  /**
   * Update average performance metrics
   */
  static updateAverages() {
    const history = this.metrics.history;
    if (history.length === 0) return;

    // Calculate averages for each metric
    const keys = Object.keys(this.metrics.averages);
    keys.forEach(key => {
      const values = history
        .filter(entry => entry[key] !== undefined)
        .map(entry => entry[key]);
      
      if (values.length > 0) {
        this.metrics.averages[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });
  }

  /**
   * Send metrics to an analytics service
   * @param {Object} metrics The metrics to send
   */
  static sendToAnalytics(metrics) {
    // This could be implemented to send data to a monitoring service
    // like Google Analytics, Application Insights, etc.
    try {
      // Placeholder for analytics integration
      if (window.analyticsService && typeof window.analyticsService.trackEvent === 'function') {
        window.analyticsService.trackEvent('ChatPerformance', metrics);
      }
    } catch (error) {
      console.error('Error sending metrics to analytics:', error);
    }
  }

  /**
   * Get performance insights based on collected metrics
   * @returns {Object} Performance insights and recommendations
   */
  static getInsights() {
    const averages = this.metrics.averages;
    const insights = {
      bottlenecks: [],
      recommendations: []
    };

    // Identify bottlenecks
    if (averages.hydeGenerationTime > 1000) {
      insights.bottlenecks.push('HyDE generation is taking longer than expected');
      insights.recommendations.push('Consider caching HyDE results for similar queries');
    }

    if (averages.searchTime > 500) {
      insights.bottlenecks.push('Vector search is slow');
      insights.recommendations.push('Check Qdrant performance and consider optimization');
    }

    if (averages.llmGenerationTime > 2000) {
      insights.bottlenecks.push('LLM response generation is slow');
      insights.recommendations.push('Consider using a faster model or optimizing prompts');
    }

    // Overall performance assessment
    if (averages.totalResponseTime > 5000) {
      insights.overall = 'Performance needs improvement';
    } else if (averages.totalResponseTime > 3000) {
      insights.overall = 'Performance is acceptable but could be better';
    } else {
      insights.overall = 'Performance is good';
    }

    return insights;
  }

  /**
   * Reset all metrics
   */
  static resetMetrics() {
    this.metrics.history = [];
    const averageKeys = Object.keys(this.metrics.averages);
    averageKeys.forEach(key => {
      this.metrics.averages[key] = 0;
    });
  }
}

export default PerformanceMonitoringService;
