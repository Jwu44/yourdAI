import React from 'react'
import { Loader2, Calendar, CheckCircle } from 'lucide-react'

interface CalendarConnectionLoaderProps {
  stage: 'connecting' | 'verifying' | 'complete'
  message?: string
}

/**
 * Loading screen shown during calendar connection process
 * Displays between authentication and dashboard redirect
 */
export const CalendarConnectionLoader: React.FC<CalendarConnectionLoaderProps> = ({
  stage,
  message
}) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-purple-600" />,
          title: 'Connecting to Google Calendar...',
          description: 'Storing your calendar credentials securely'
        }
      case 'verifying':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-purple-600" />,
          title: 'Verifying Connection...',
          description: 'Confirming calendar access is ready'
        }
      case 'complete':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-600" />,
          title: 'Calendar Connected!',
          description: 'Redirecting to your dashboard'
        }
    }
  }

  const stageInfo = getStageInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Setting Up Your Calendar
          </h1>
          <p className="text-gray-600">
            We're preparing your personalized schedule experience
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-6">
          {/* Current Stage */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {stageInfo.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {stageInfo.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {message || stageInfo.description}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-purple-600 h-2 rounded-full transition-all duration-500 ${
                stage === 'connecting'
? 'w-1/3'
                : stage === 'verifying' ? 'w-2/3' : 'w-full'
              }`}
            />
          </div>

          {/* Steps */}
          <div className="space-y-2 text-sm">
            <div className={`flex items-center space-x-2 ${
              stage === 'connecting' ? 'text-purple-600' : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                stage === 'connecting' ? 'bg-purple-600' : 'bg-gray-300'
              }`} />
              <span>Connecting to Google Calendar</span>
            </div>
            <div className={`flex items-center space-x-2 ${
              stage === 'verifying' ? 'text-purple-600' : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                stage === 'verifying' ? 'bg-purple-600' : 'bg-gray-300'
              }`} />
              <span>Verifying calendar access</span>
            </div>
            <div className={`flex items-center space-x-2 ${
              stage === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                stage === 'complete' ? 'bg-green-600' : 'bg-gray-300'
              }`} />
              <span>Ready to go!</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            This usually takes just a few seconds
          </p>
        </div>
      </div>
    </div>
  )
}

export default CalendarConnectionLoader
