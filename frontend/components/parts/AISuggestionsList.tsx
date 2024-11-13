import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, BarChart, Sun, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import type { AISuggestion } from '@/lib/types';
import { cn } from "@/lib/utils";

interface AISuggestionsListProps {
  suggestions: AISuggestion[];
  onAccept: (suggestion: AISuggestion) => void;
  onReject: (suggestionId: string) => void;
  className?: string;
}

const getTypeIcon = (type: string) => {
  switch(type) {
    case 'Energy Optimization':
      return <Sun className="h-4 w-4" />;
    case 'Procrastination Prevention':
      return <Clock className="h-4 w-4" />;
    case 'Priority Rebalancing':
      return <BarChart className="h-4 w-4" />;
    case 'Task Structure':
      return <Brain className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
};

const AISuggestionsList: React.FC<AISuggestionsListProps> = ({
    suggestions,
    onAccept,
    onReject,
    className = ''
  }) => {
    return (
      <TooltipProvider>
        <AnimatePresence>
          <div className={`space-y-2 ${className}`}>
            {suggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex-1 mr-4">
                  <div className="flex items-center mb-2">
                    <span className="text-muted-foreground">
                      {getTypeIcon(suggestion.type)}
                    </span>
                    <Badge 
                      className={cn(
                        "ml-2",
                        suggestion.confidence > 0.8 ? "bg-green-600" : "bg-yellow-600"
                      )}
                      variant="secondary"
                    >
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground mb-1">{suggestion.text}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        View rationale
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="bottom" 
                      className="max-w-xs bg-popover text-popover-foreground"
                    >
                      <p>{suggestion.rationale}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAccept(suggestion)}
                    className="text-green-500 hover:text-green-400"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onReject(suggestion.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </TooltipProvider>
    );
  };

export default React.memo(AISuggestionsList);