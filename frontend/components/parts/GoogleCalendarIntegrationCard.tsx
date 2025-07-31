/**
 * @file GoogleCalendarIntegrationCard.tsx
 * @description Component for managing Google Calendar integration status and reconnection
 * Provides users with calendar connection status and ability to reconnect
 */

'use client'

import React, { useState, useEffect } from 'react'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Icons
import { Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

// Auth & API
import { useAuth } from '@/auth/AuthContext'
import { calendarApi } from '@/lib/api/calendar'
import { useToast } from '@/hooks/use-toast'

// Types
import { type UserDocument } from '@/lib/types'

/**
 * Google Calendar integration card component
 * Shows connection status and provides reconnection functionality
 */
const GoogleCalendarIntegrationCard: React.FC = () => {
  const { currentUser, reconnectCalendar } = useAuth()
  const { toast } = useToast()

  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean
    syncStatus: string
    lastSyncTime: string | null
    hasCredentials: boolean
  } | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)

  /**
    * Fetch current calendar connection status
    */
  const fetchConnectionStatus = async () => {
    if (!currentUser) return

    try {
      setIsLoading(true)
      const status = await calendarApi.getCalendarStatus(currentUser.uid)
      // Map backend response to expected format
      setConnectionStatus({
        connected: status.connected || false,
        syncStatus: status.syncStatus || 'never',
        lastSyncTime: status.lastSyncTime || null,
        hasCredentials: Boolean((status as any).hasCredentials || status.credentials)
      })
    } catch (error) {
      console.error('Failed to fetch calendar status:', error)
      toast({
        title: 'Error',
        description: 'Failed to check calendar connection status',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle calendar reconnection
   */
  const handleReconnect = async () => {
    try {
      setIsReconnecting(true)
      await reconnectCalendar()

      toast({
        title: 'Calendar Connected',
        description: 'Google Calendar has been successfully reconnected',
        variant: 'default'
      })

      // Refresh status after successful reconnection
      await fetchConnectionStatus()
    } catch (error) {
      console.error('Calendar reconnection failed:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to reconnect calendar',
        variant: 'destructive'
      })
    } finally {
      setIsReconnecting(false)
    }
  }

  // Fetch status on component mount and when user changes
  useEffect(() => {
    if (currentUser) {
      fetchConnectionStatus()
    }
  }, [currentUser])

  // Render loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Calendar className="h-6 w-6 mr-2 text-blue-600" />
          <div>
            <CardTitle className="text-lg">Google Calendar</CardTitle>
            <CardDescription>Sync your calendar events as tasks</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Checking connection status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine status badge and actions
  const isConnected = connectionStatus?.connected && connectionStatus?.hasCredentials
  const statusBadge = isConnected
    ? (
    <Badge variant="outline" className="text-green-600 border-green-600">
      <CheckCircle className="h-3 w-3 mr-1" />
      Connected
    </Badge>
      )
    : (
    <Badge variant="outline" className="text-orange-600 border-orange-600">
      <AlertCircle className="h-3 w-3 mr-1" />
      Disconnected
    </Badge>
      )

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <Calendar className="h-6 w-6 mr-2 text-blue-600" />
        <div className="flex-1">
          <CardTitle className="text-lg">Google Calendar</CardTitle>
          <CardDescription>Sync your calendar events as tasks</CardDescription>
        </div>
        {statusBadge}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status Details */}
        {connectionStatus && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sync Status:</span>
              <span className="capitalize">{connectionStatus.syncStatus}</span>
            </div>
            {connectionStatus.lastSyncTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sync:</span>
                <span>{new Date(connectionStatus.lastSyncTime).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isConnected
            ? (
            <Button
              onClick={handleReconnect}
              disabled={isReconnecting}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {isReconnecting
                ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reconnecting...
                </>
                  )
                : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Connection
                </>
                  )}
            </Button>
              )
            : (
            <Button
              onClick={handleReconnect}
              disabled={isReconnecting}
              size="sm"
              className="flex-1"
            >
              {isReconnecting
                ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
                  )
                : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Connect Calendar
                </>
                  )}
            </Button>
              )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          {isConnected
            ? 'Your calendar events are being synced as tasks. Refresh if you experience sync issues.'
            : 'Connect your Google Calendar to automatically import events as tasks in your daily schedule.'
          }
        </p>
      </CardContent>
    </Card>
  )
}

export default GoogleCalendarIntegrationCard
