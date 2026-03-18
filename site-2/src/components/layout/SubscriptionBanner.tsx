'use client'

import { AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function SubscriptionBanner({ subscriptionEnd }: { subscriptionEnd: string | null }) {
  if (!subscriptionEnd) return null

  const endDate = new Date(subscriptionEnd)
  const now = new Date()
  const msLeft = endDate.getTime() - now.getTime()
  const minutesLeft = Math.ceil(msLeft / 60000)
  const daysLeft = Math.ceil(msLeft / 86400000)

  // Don't show banner if more than 7 days left
  if (daysLeft > 7) return null

  const isExpired = msLeft <= 0

  // Format the exact expiry date/time
  const formattedDate = endDate.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
  const formattedTime = endDate.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  // Human readable time left
  const timeLeftLabel = isExpired
    ? 'Expired'
    : minutesLeft < 60
    ? `${minutesLeft} min left`
    : daysLeft < 1
    ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left`
    : `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`

  return (
    <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-medium gap-3 ${
      isExpired ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-800'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        {isExpired
          ? <AlertCircle className="w-4 h-4 shrink-0" />
          : <Clock className="w-4 h-4 shrink-0" />
        }
        <span className="truncate">
          {isExpired
            ? `Subscription expired on ${formattedDate} at ${formattedTime}`
            : `Subscription expires ${formattedDate} at ${formattedTime} — ${timeLeftLabel}`
          }
        </span>
      </div>
      <Link
        href="/renew"
        className={`px-3 py-1 rounded-full whitespace-nowrap font-bold shrink-0 ${
          isExpired ? 'bg-white text-red-600' : 'bg-amber-500 text-white'
        }`}
      >
        Renew Now
      </Link>
    </div>
  )
}
