import React from 'react';
import { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox'; // Add this import

interface MicrostepSuggestionsProps {
  microsteps: Task[];
  onAccept: (microstep: Task) => void;
  onReject: (microstep: Task) => void;
  className?: string;
}

const MicrostepSuggestions: React.FC<MicrostepSuggestionsProps> = ({
  microsteps,
  onAccept,
  onReject,
  className
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`space-y-2 pl-8 ${className}`}
      >
        {microsteps.map((microstep) => (
          <motion.div
            key={microstep.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="flex items-center justify-between p-2 bg-gray-800 rounded-md border border-gray-700"
          >
            {/* Add checkbox and text container */}
            <div className="flex items-center flex-1 mr-4">
              {/* Unchecked, disabled checkbox for visual consistency */}
              <div className="flex items-center">
                <Checkbox
                  checked={false}
                  disabled
                  className="mr-2 border-white opacity-50"
                />
              </div>
              {/* Text content */}
              <div className="flex-1">
                <p className="text-sm text-white">{microstep.text}</p>
                {microstep.rationale && (
                  <p className="text-xs text-gray-400 mt-1">{microstep.rationale}</p>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-green-500 hover:text-green-400"
                onClick={() => onAccept(microstep)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-400"
                onClick={() => onReject(microstep)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default React.memo(MicrostepSuggestions);