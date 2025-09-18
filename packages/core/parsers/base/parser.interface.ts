/**
 * Base parser interface for all platform parsers
 * Defines the contract that all platform-specific parsers must implement
 */

import { BaseMediaRecord, BaseParserConfig, BaseParserResult } from '../../types'

export interface BaseParser<T extends BaseMediaRecord> {
  /**
   * Parse data from a file and return structured records
   */
  parse(file: File): Promise<BaseParserResult<T>>
  
  /**
   * Parse data from a string and return structured records
   */
  parseString(data: string, filename: string): Promise<BaseParserResult<T>>
  
  /**
   * Validate if a file can be parsed by this parser
   */
  canParse(file: File): boolean
  
  /**
   * Get parser configuration
   */
  getConfig(): BaseParserConfig
  
  /**
   * Get supported file formats
   */
  getSupportedFormats(): string[]
  
  /**
   * Get maximum file size supported
   */
  getMaxFileSize(): number
}

export interface ParserProgress {
  stage: 'reading' | 'parsing' | 'processing' | 'complete'
  progress: number // 0-100
  message: string
  recordsProcessed: number
  totalRecords?: number
  eta?: number // seconds
}

export interface ParserOptions {
  onProgress?: (progress: ParserProgress) => void
  onError?: (error: Error) => void
  validateData?: boolean
  maxRecords?: number
  chunkSize?: number
}
