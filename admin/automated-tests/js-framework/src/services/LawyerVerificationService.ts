import fs from 'fs';
import path from 'path';
import _ from 'lodash';

export interface LawyerRecord {
  Lastname: string;
  Firstname: string;
  'Middle Name': string;
  Address: string;
  'Roll Signed Date': string;
  'Roll No.': string;
}

export interface LawyerApplication {
  applicant_name: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  address?: string;
  roll_number?: string;
  application_id: string;
}

export interface VerificationResult {
  isVerified: boolean;
  confidence: number;
  matches: LawyerRecord[];
  matchType: 'EXACT' | 'PARTIAL' | 'MULTIPLE' | 'NONE';
  processingTime: number;
}

export class LawyerVerificationService {
  private lawyersDatabase: LawyerRecord[] = [];
  private databasePath: string;

  constructor(databasePath?: string) {
    this.databasePath = databasePath || path.join(__dirname, '../../../data/lawyers_list.json');
    this.loadDatabase();
  }

  private loadDatabase(): void {
    try {
      const startTime = Date.now();
      const rawData = fs.readFileSync(this.databasePath, 'utf8');
      this.lawyersDatabase = JSON.parse(rawData);
      const loadTime = Date.now() - startTime;
      console.log(`Database loaded: ${this.lawyersDatabase.length} records in ${loadTime}ms`);
    } catch (error) {
      console.error('Failed to load lawyers database:', error);
      throw new Error('Database unavailable');
    }
  }

  public async verifyLawyer(application: LawyerApplication): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      // Normalize application data
      const normalizedApp = this.normalizeApplicationData(application);
      
      // Search for matches
      const matches = this.findMatches(normalizedApp);
      
      // Determine verification result
      const result = this.analyzeMatches(matches, normalizedApp);
      
      const processingTime = Date.now() - startTime;
      
      return {
        ...result,
        processingTime
      };
    } catch (error) {
      return {
        isVerified: false,
        confidence: 0,
        matches: [],
        matchType: 'NONE',
        processingTime: Date.now() - startTime
      };
    }
  }

  public async bulkVerifyLawyers(applications: LawyerApplication[]): Promise<VerificationResult[]> {
    const startTime = Date.now();
    const results: VerificationResult[] = [];
    
    for (const application of applications) {
      const result = await this.verifyLawyer(application);
      results.push(result);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Bulk verification completed: ${applications.length} applications in ${totalTime}ms`);
    
    return results;
  }

  private normalizeApplicationData(application: LawyerApplication): LawyerApplication {
    return {
      ...application,
      first_name: application.first_name?.trim().toUpperCase() || '',
      last_name: application.last_name?.trim().toUpperCase() || '',
      middle_name: application.middle_name?.trim().toUpperCase() || '',
      address: application.address?.trim() || ''
    };
  }

  private findMatches(application: LawyerApplication): LawyerRecord[] {
    const matches: LawyerRecord[] = [];
    
    for (const lawyer of this.lawyersDatabase) {
      const score = this.calculateSimilarityScore(application, lawyer);
      if (score > 0.6) { // 60% similarity threshold
        matches.push(lawyer);
      }
    }
    
    return matches.sort((a, b) => 
      this.calculateSimilarityScore(application, b) - 
      this.calculateSimilarityScore(application, a)
    );
  }

  private calculateSimilarityScore(application: LawyerApplication, lawyer: LawyerRecord): number {
    let score = 0;
    let totalWeight = 0;
    
    // First name comparison (weight: 30%)
    const firstNameScore = this.stringSimilarity(
      application.first_name, 
      lawyer.Firstname.toUpperCase()
    );
    score += firstNameScore * 0.3;
    totalWeight += 0.3;
    
    // Last name comparison (weight: 40%)
    const lastNameScore = this.stringSimilarity(
      application.last_name, 
      lawyer.Lastname.toUpperCase()
    );
    score += lastNameScore * 0.4;
    totalWeight += 0.4;
    
    // Middle name comparison (weight: 20%)
    if (application.middle_name && lawyer['Middle Name']) {
      const middleNameScore = this.stringSimilarity(
        application.middle_name, 
        lawyer['Middle Name'].toUpperCase()
      );
      score += middleNameScore * 0.2;
      totalWeight += 0.2;
    }
    
    // Address comparison (weight: 10%)
    if (application.address && lawyer.Address) {
      const addressScore = this.stringSimilarity(
        application.address.toUpperCase(), 
        lawyer.Address.toUpperCase()
      );
      score += addressScore * 0.1;
      totalWeight += 0.1;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private analyzeMatches(matches: LawyerRecord[], application: LawyerApplication): Omit<VerificationResult, 'processingTime'> {
    if (matches.length === 0) {
      return {
        isVerified: false,
        confidence: 0,
        matches: [],
        matchType: 'NONE'
      };
    }
    
    if (matches.length === 1) {
      const confidence = this.calculateSimilarityScore(application, matches[0]);
      return {
        isVerified: confidence > 0.9,
        confidence: Math.round(confidence * 100),
        matches,
        matchType: confidence > 0.9 ? 'EXACT' : 'PARTIAL'
      };
    }
    
    // Multiple matches
    const bestMatch = matches[0];
    const confidence = this.calculateSimilarityScore(application, bestMatch);
    
    return {
      isVerified: confidence > 0.95, // Higher threshold for multiple matches
      confidence: Math.round(confidence * 100),
      matches,
      matchType: 'MULTIPLE'
    };
  }

  public getDatabaseStats(): { totalRecords: number; databaseSize: string } {
    const stats = fs.statSync(this.databasePath);
    return {
      totalRecords: this.lawyersDatabase.length,
      databaseSize: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
    };
  }
}
