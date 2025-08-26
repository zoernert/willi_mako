const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

/**
 * API Key Manager Service
 * Handles intelligent switching between free and paid Google AI API keys
 * based on quota usage
 */
class GoogleAIKeyManager {
  constructor() {
    // Configuration
    this.freeApiKey = process.env.GOOGLE_AI_API_KEY_FREE;
    this.paidApiKey = process.env.GOOGLE_AI_API_KEY;
    
    // Track usage and rate limiting
    this.usageCounter = {
      free: {
        dailyUsage: 0,
        dailyLimit: 100, // Adjust this based on actual free tier limits
        minuteUsage: 0,
        minuteLimit: 10, // Adjust this based on actual free tier rate limits
        lastMinute: this.getCurrentMinute(),
        lastDay: this.getCurrentDay()
      }
    };
    
    // Admin metrics
    this.usageMetrics = {
      free: {
        dailyUsage: {},  // Format: { "2025-08-26": 42 }
        totalUsage: 0,
        lastReset: null
      },
      paid: {
        dailyUsage: {},  // Format: { "2025-08-26": 17 }
        totalUsage: 0,
        lastReset: null
      }
    };
    
    // Backoff strategy
    this.backoffTimes = [1000, 2000, 5000, 10000, 15000]; // Increasing backoff in ms
    this.currentBackoff = 0;
    
    // Initialize the API clients
    this.freeGenAI = new GoogleGenerativeAI(this.freeApiKey);
    this.paidGenAI = new GoogleGenerativeAI(this.paidApiKey);
    
    console.log('GoogleAIKeyManager initialized with free and paid API keys');
    
    // Load saved metrics
    this.loadMetrics().catch(err => {
      console.error('Failed to load API key metrics:', err);
    });
  }

  /**
   * Get the current minute for rate limiting
   */
  getCurrentMinute() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  }

  /**
   * Get the current day for daily quota tracking
   */
  getCurrentDay() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }

  /**
   * Check and update rate limits for the current time period
   */
  updateRateLimits() {
    const currentMinute = this.getCurrentMinute();
    const currentDay = this.getCurrentDay();
    
    // Reset minute counter if we're in a new minute
    if (currentMinute !== this.usageCounter.free.lastMinute) {
      this.usageCounter.free.minuteUsage = 0;
      this.usageCounter.free.lastMinute = currentMinute;
    }
    
    // Reset daily counter if we're on a new day
    if (currentDay !== this.usageCounter.free.lastDay) {
      this.usageCounter.free.dailyUsage = 0;
      this.usageCounter.free.lastDay = currentDay;
    }
  }

  /**
   * Increment usage counters after using the free API key
   */
  incrementUsage() {
    this.usageCounter.free.dailyUsage += 1;
    this.usageCounter.free.minuteUsage += 1;
  }

  /**
   * Check if free tier limits have been reached
   */
  isFreeQuotaAvailable() {
    this.updateRateLimits();
    
    const dailyAvailable = this.usageCounter.free.dailyUsage < this.usageCounter.free.dailyLimit;
    const minuteAvailable = this.usageCounter.free.minuteUsage < this.usageCounter.free.minuteLimit;
    
    return dailyAvailable && minuteAvailable;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the appropriate Generative AI instance based on quota availability
   * Will try to use free tier first with intelligent backoff strategy
   * @param {string} model - The model name to use
   * @returns {Object} A configured Google Generative AI model instance
   */
  async getGenerativeModel(options) {
    try {
      // Always try free tier first
      if (this.isFreeQuotaAvailable()) {
        // Track this usage
        this.incrementUsage();
        
        // Track for admin metrics
        this.trackKeyUsage('free');
        
        return this.freeGenAI.getGenerativeModel(options);
      }

      // Check if we've hit the minute rate limit but not the daily limit
      if (this.usageCounter.free.dailyUsage < this.usageCounter.free.dailyLimit &&
          this.usageCounter.free.minuteUsage >= this.usageCounter.free.minuteLimit) {
        
        // If we hit the minute limit, apply exponential backoff
        const backoffTime = this.backoffTimes[this.currentBackoff];
        console.log(`Rate limited, waiting ${backoffTime}ms before retrying...`);
        
        // Wait for the backoff time
        await this.sleep(backoffTime);
        
        // Increase backoff for next time (with maximum cap)
        this.currentBackoff = Math.min(this.currentBackoff + 1, this.backoffTimes.length - 1);
        
        // Check again after waiting
        if (this.isFreeQuotaAvailable()) {
          this.incrementUsage();
          
          // Track for admin metrics
          this.trackKeyUsage('free');
          
          return this.freeGenAI.getGenerativeModel(options);
        }
      } else {
        // Reset backoff counter if we're not hitting rate limits
        this.currentBackoff = 0;
      }

      // Fall back to paid tier if free quota is exhausted
      console.log('Free quota exhausted, using paid API key');
      
      // Track for admin metrics
      this.trackKeyUsage('paid');
      
      return this.paidGenAI.getGenerativeModel(options);
    } catch (error) {
      console.error('Error in key manager:', error);
      
      // Always fallback to the paid key if there's any error with the free key
      // Track for admin metrics
      this.trackKeyUsage('paid');
      
      return this.paidGenAI.getGenerativeModel(options);
    }
  }

  /**
   * Get the raw GoogleGenerativeAI instance (either free or paid)
   * based on quota availability
   */
  getGenAI() {
    if (this.isFreeQuotaAvailable()) {
      this.incrementUsage();
      
      // Track for admin metrics
      this.trackKeyUsage('free');
      
      return this.freeGenAI;
    }
    
    // Track for admin metrics
    this.trackKeyUsage('paid');
    
    return this.paidGenAI;
  }

  /**
   * Load metrics from persistent storage
   */
  async loadMetrics() {
    try {
      const metricsPath = path.join(process.cwd(), 'data', 'api-key-metrics.json');
      
      try {
        const data = await fs.readFile(metricsPath, 'utf8');
        const savedMetrics = JSON.parse(data);
        
        if (savedMetrics && savedMetrics.free && savedMetrics.paid) {
          this.usageMetrics = savedMetrics;
          console.log('Loaded API key metrics from storage');
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist yet, create directory if needed
          try {
            await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
          } catch (mkdirErr) {
            console.error('Error creating metrics directory:', mkdirErr);
          }
          console.log('No existing metrics found, starting fresh');
        } else {
          console.error('Error loading metrics:', err);
        }
      }
    } catch (error) {
      console.error('Error in loadMetrics:', error);
    }
  }

  /**
   * Save metrics to persistent storage
   */
  async saveMetrics() {
    try {
      const metricsPath = path.join(process.cwd(), 'data', 'api-key-metrics.json');
      await fs.writeFile(metricsPath, JSON.stringify(this.usageMetrics, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Track API key usage
   * @param {string} keyType - Either 'free' or 'paid'
   */
  trackKeyUsage(keyType) {
    const today = this.getCurrentDay();
    
    // Initialize if this day doesn't exist yet
    if (!this.usageMetrics[keyType].dailyUsage[today]) {
      this.usageMetrics[keyType].dailyUsage[today] = 0;
    }
    
    // Increment counters
    this.usageMetrics[keyType].dailyUsage[today]++;
    this.usageMetrics[keyType].totalUsage++;
    
    // Save metrics periodically (not on every call to avoid I/O overhead)
    if (this.usageMetrics[keyType].totalUsage % 10 === 0) {
      this.saveMetrics();
    }
  }

  /**
   * Get usage metrics for admin dashboard
   * @returns {Object} The usage metrics for both API keys
   */
  getUsageMetrics() {
    return {
      free: {
        dailyUsage: this.usageMetrics.free.dailyUsage,
        totalUsage: this.usageMetrics.free.totalUsage,
        currentDayUsage: this.usageMetrics.free.dailyUsage[this.getCurrentDay()] || 0,
        quotaLimit: this.usageCounter.free.dailyLimit
      },
      paid: {
        dailyUsage: this.usageMetrics.paid.dailyUsage,
        totalUsage: this.usageMetrics.paid.totalUsage,
        currentDayUsage: this.usageMetrics.paid.dailyUsage[this.getCurrentDay()] || 0
      },
      summary: {
        currentDay: this.getCurrentDay(),
        costSavings: this.calculateCostSavings()
      }
    };
  }

  /**
   * Calculate estimated cost savings from using free tier
   * @returns {Object} Cost savings information
   */
  calculateCostSavings() {
    // Approximate cost per 1000 requests (in USD)
    const costPer1000Requests = 0.35;
    
    // Calculate total free tier usage
    const totalFreeUsage = this.usageMetrics.free.totalUsage;
    
    // Calculate cost savings
    const costSavings = (totalFreeUsage / 1000) * costPer1000Requests;
    
    return {
      totalFreeRequests: totalFreeUsage,
      costSavingsUSD: costSavings.toFixed(2),
      costSavingsEUR: (costSavings * 0.85).toFixed(2) // Approximate EUR conversion
    };
  }
}

// Singleton instance
const googleAIKeyManager = new GoogleAIKeyManager();

module.exports = googleAIKeyManager;
