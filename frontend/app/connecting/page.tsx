'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarConnectionLoader } from '@/components/parts/CalendarConnectionLoader'
import { useToast } from '@/hooks/use-toast'

/**
 * Connecting page shown during calendar connection process
 * Displays loading states and handles redirect to dashboard
 * Also handles error cases with toast notifications and redirects to integrations
 */
export default function ConnectingPage () {
  const router = useRouter()
  const { toast } = useToast()
  const [stage, setStage] = useState<'connecting' | 'verifying' | 'complete'>('connecting')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const handleCalendarConnection = async () => {
      try {
        // Check for error information first
        const errorInfo = localStorage.getItem('calendarConnectionError')
        if (errorInfo) {
          try {
            const errorData = JSON.parse(errorInfo)
            console.log('Calendar connection error detected:', errorData)

            // Clear the error flag
            localStorage.removeItem('calendarConnectionError')

            // Show error toast
            toast({
              title: 'Calendar Connection Failed',
              description: errorData.error || 'Failed to connect to Google Calendar',
              variant: 'destructive'
            })

            // Redirect based on error action
            if (errorData.action === 'redirect_to_integrations') {
              console.log('Redirecting to integrations page due to calendar connection error')
              setTimeout(() => {
                router.push('/dashboard/integrations')
              }, 2000) // Give time for user to see the toast
            } else {
              console.log('Redirecting to dashboard due to general error')
              setTimeout(() => {
                router.push('/dashboard')
              }, 2000)
            }
            return
          } catch (parseError) {
            console.error('Error parsing calendar connection error:', parseError)
            // Fall through to normal flow
          }
        }

        // Check for connection progress in localStorage
        const connectionProgress = localStorage.getItem('calendarConnectionProgress')
        console.log('Connection progress on page load:', connectionProgress)

        if (connectionProgress === 'connecting') {
          setStage('connecting')
          setMessage('Storing your calendar credentials securely')
        } else if (connectionProgress === 'verifying') {
          setStage('verifying')
          setMessage('Confirming calendar access is ready')
        } else if (connectionProgress === 'complete') {
          setStage('complete')
          setMessage('Calendar connected successfully!')

          // Short delay to show completion state
          setTimeout(() => {
            const finalDestination = localStorage.getItem('finalRedirectDestination') || '/dashboard'
            localStorage.removeItem('calendarConnectionProgress')
            localStorage.removeItem('finalRedirectDestination')
            console.log('Redirecting to final destination:', finalDestination)
            router.push(finalDestination)
          }, 1500)
        } else {
          // No progress found, redirect to dashboard
          console.log('No connection progress found, redirecting to dashboard')
          router.push('/dashboard')
        }

        // Listen for progress updates (in case connection is still in progress)
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key === 'calendarConnectionProgress') {
            const newProgress = e.newValue
            console.log('Progress updated:', newProgress)

            if (newProgress === 'verifying') {
              setStage('verifying')
              setMessage('Confirming calendar access is ready')
            } else if (newProgress === 'complete') {
              setStage('complete')
              setMessage('Calendar connected successfully!')

              setTimeout(() => {
                const finalDestination = localStorage.getItem('finalRedirectDestination') || '/dashboard'
                localStorage.removeItem('calendarConnectionProgress')
                localStorage.removeItem('finalRedirectDestination')
                console.log('Redirecting to final destination:', finalDestination)
                router.push(finalDestination)
              }, 1500)
            }
          }

          // Also listen for error updates
          if (e.key === 'calendarConnectionError' && e.newValue) {
            try {
              const errorData = JSON.parse(e.newValue)
              console.log('Calendar connection error received:', errorData)

              // Clear the error flag
              localStorage.removeItem('calendarConnectionError')

              // Show error toast
              toast({
                title: 'Calendar Connection Failed',
                description: errorData.error || 'Failed to connect to Google Calendar',
                variant: 'destructive'
              })

              // Redirect based on error action
              if (errorData.action === 'redirect_to_integrations') {
                setTimeout(() => {
                  router.push('/dashboard/integrations')
                }, 2000)
              } else {
                setTimeout(() => {
                  router.push('/dashboard')
                }, 2000)
              }
            } catch (parseError) {
              console.error('Error parsing calendar connection error:', parseError)
            }
          }
        }

        window.addEventListener('storage', handleStorageChange)

        // Fallback timeout - redirect after 15 seconds regardless
        const fallbackTimeout = setTimeout(() => {
          console.log('Calendar connection timeout, redirecting to dashboard')
          const finalDestination = localStorage.getItem('finalRedirectDestination') || '/dashboard'
          localStorage.removeItem('calendarConnectionProgress')
          localStorage.removeItem('finalRedirectDestination')
          localStorage.removeItem('calendarConnectionError')
          router.push(finalDestination)
        }, 15000)

        return () => {
          window.removeEventListener('storage', handleStorageChange)
          clearTimeout(fallbackTimeout)
        }
      } catch (error) {
        console.error('Error in connecting page:', error)
        // Fallback to dashboard on error
        localStorage.removeItem('calendarConnectionProgress')
        localStorage.removeItem('finalRedirectDestination')
        localStorage.removeItem('calendarConnectionError')

        // Show error toast
        toast({
          title: 'Connection Error',
          description: 'An unexpected error occurred during setup',
          variant: 'destructive'
        })

        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    }

    handleCalendarConnection()
  }, [router, toast])

  return <CalendarConnectionLoader stage={stage} message={message} />
}
