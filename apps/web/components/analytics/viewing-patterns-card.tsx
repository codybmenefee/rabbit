'use client'

import { ViewingPattern } from '@/lib/advanced-analytics'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, 
  Clock, 
  Target, 
  Moon, 
  Sun, 
  Calendar, 
  Activity,
  TrendingUp
} from 'lucide-react'

interface ViewingPatternsCardProps {
  patterns: ViewingPattern[]
}

export function ViewingPatternsCard({ patterns }: ViewingPatternsCardProps) {
  const getPatternIcon = (type: ViewingPattern['type']) => {
    switch (type) {
      case 'binge': return Zap
      case 'consistent': return Activity
      case 'sporadic': return Target
      case 'weekend_warrior': return Calendar
      case 'night_owl': return Moon
      case 'morning_bird': return Sun
      default: return Clock
    }
  }

  const getPatternColor = (type: ViewingPattern['type']) => {
    switch (type) {
      case 'binge': return 'signal-red'
      case 'consistent': return 'signal-green'
      case 'sporadic': return 'signal-orange'
      case 'weekend_warrior': return 'signal-blue'
      case 'night_owl': return 'signal-purple'
      case 'morning_bird': return 'signal-yellow'
      default: return 'signal-cyan'
    }
  }

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { label: 'HIGH', color: 'bg-signal-green-500' }
    if (confidence >= 0.6) return { label: 'MEDIUM', color: 'bg-signal-yellow-500' }
    return { label: 'LOW', color: 'bg-signal-red-500' }
  }

  const formatPatternTitle = (type: ViewingPattern['type']) => {
    return type.toUpperCase().replace(/_/g, '_')
  }

  return (
    <Card className="terminal-surface border-terminal-border p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-terminal-text terminal-text mb-2">BEHAVIORAL_PATTERNS</h3>
          <p className="text-sm text-terminal-muted terminal-text">
            AI-detected viewing behavior classification and confidence scoring
          </p>
        </div>

        {patterns.length > 0 ? (
          <div className="space-y-4">
            {patterns.map((pattern, index) => {
              const PatternIcon = getPatternIcon(pattern.type)
              const patternColor = getPatternColor(pattern.type)
              const confidence = getConfidenceLevel(pattern.confidence)
              
              return (
                <div 
                  key={`${pattern.type}-${index}`}
                  className="terminal-surface border-terminal-border rounded-lg p-4 space-y-3"
                >
                  {/* Pattern Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="terminal-surface border-terminal-border rounded p-2">
                        <PatternIcon className={`w-4 h-4 ${patternColor}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-terminal-text terminal-text">
                          {formatPatternTitle(pattern.type)}
                        </h4>
                        <p className="text-xs text-terminal-muted terminal-text">
                          {pattern.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${confidence.color}`} />
                      <span className="text-xs text-terminal-muted terminal-text">
                        {confidence.label}
                      </span>
                      <span className="text-xs text-terminal-text terminal-text font-medium">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Evidence */}
                  <div className="space-y-2">
                    <div className="text-xs text-terminal-muted terminal-text font-medium">
                      SUPPORTING_EVIDENCE:
                    </div>
                    <ul className="space-y-1">
                      {pattern.evidence.map((evidence, evidenceIndex) => (
                        <li 
                          key={evidenceIndex}
                          className="text-xs text-terminal-text terminal-text pl-4 relative"
                        >
                          <div className="absolute left-0 top-1.5 w-1 h-1 bg-terminal-muted rounded-full" />
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Confidence Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-terminal-muted terminal-text">Confidence</span>
                      <span className="text-terminal-text terminal-text">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1 bg-terminal-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          pattern.confidence >= 0.8 ? 'bg-signal-green-500' : 
                          pattern.confidence >= 0.6 ? 'bg-signal-yellow-500' : 'bg-signal-red-500'
                        }`}
                        style={{ width: `${pattern.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="terminal-surface border-terminal-border rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-terminal-muted" />
            </div>
            <div className="text-sm text-terminal-muted terminal-text">
              INSUFFICIENT_DATA_FOR_PATTERN_ANALYSIS
            </div>
            <div className="text-xs text-terminal-muted terminal-text mt-2">
              More viewing data required to detect behavioral patterns
            </div>
          </div>
        )}

        {/* Pattern Summary */}
        {patterns.length > 0 && (
          <div className="border-t border-terminal-border pt-4">
            <div className="text-xs text-terminal-muted terminal-text mb-2">
              DETECTED_PATTERNS: {patterns.length}
            </div>
            <div className="flex flex-wrap gap-2">
              {patterns.map((pattern, index) => (
                <Badge 
                  key={`${pattern.type}-badge-${index}`}
                  variant="outline"
                  className={`text-xs ${getPatternColor(pattern.type)} border-terminal-border`}
                >
                  {formatPatternTitle(pattern.type)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}