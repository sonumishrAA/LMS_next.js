'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { format, differenceInDays, isPast, intervalToDuration } from 'date-fns'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Pencil,
  Trash2,
  Lock,
  UserCircle,
  ShieldCheck,
  LayoutGrid,
  BookOpen,
  X,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { callEdgeFunction } from '@/lib/api'

function Countdown({ targetDate, label, isUrgent }: { targetDate: string; label: string; isUrgent?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    const calculate = () => {
      const now = new Date()
      const target = new Date(targetDate)
      
      if (isPast(target)) {
        setTimeLeft('EXPIRED')
        return
      }

      const duration = intervalToDuration({ start: now, end: target })
      const parts = []
      if (duration.days) parts.push(`${duration.days}d`)
      if (duration.hours) parts.push(`${duration.hours}h`)
      if (duration.minutes) parts.push(`${duration.minutes}m`)
      if (!duration.days && !duration.hours && (duration.minutes === 0 || !duration.minutes)) {
        parts.push(`${duration.seconds || 0}s`)
      }
      
      setTimeLeft(parts.join(' ') || '0s')
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className={cn(
      "flex flex-col gap-0.5 p-2.5 rounded-xl border min-w-[120px]",
      isUrgent ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
    )}>
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none">{label}</span>
      <span className={cn(
        "text-xs font-mono font-bold leading-tight mt-0.5",
        isUrgent ? "text-red-600" : "text-gray-700"
      )}>
        {timeLeft || '...'}
      </span>
    </div>
  )
}

interface StaffMember {
  id: string
  name: string
  email: string
  auth_email?: string
  auth_name?: string
  role?: string
  staff_type?: string
  is_active?: boolean
  user_id?: string
}

interface StudentStats {
  total: number
  male: number
  female: number
  neutral: number
}

interface Library {
  id: string
  name: string
  city: string
  state: string
  address?: string
  pincode?: string
  phone?: string
  owner_id?: string
  owner_email?: string
  owner_name?: string
  subscription_status: string
  subscription_plan: string
  subscription_start?: string
  subscription_end?: string
  subscription_expires_at?: string
  expires_at?: string
  created_at: string
  updated_at?: string
  male_seats?: number
  female_seats?: number
  neutral_seats?: number
  is_gender_neutral?: boolean
  has_lockers?: boolean
  male_lockers?: number
  female_lockers?: number
  neutral_lockers?: number
  delete_date?: string
  data_cleared?: boolean
  onboarding_done?: boolean
  original_plan_price?: number
  staff?: StaffMember[]
  student_stats?: StudentStats
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      className="inline-flex items-center gap-1 text-gray-400 hover:text-brand-500 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex items-start gap-2 justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 w-32">{label}</span>
      <span className={`text-sm text-gray-800 font-medium text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{String(value)}</span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center text-brand-500">
        {icon}
      </div>
      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{title}</h4>
    </div>
  )
}

// ─── Edit Modal ────────────────────────────────────────────────────
function EditModal({
  lib,
  onClose,
  onSave,
}: {
  lib: Library
  onClose: () => void
  onSave: (id: string, updates: Record<string, string>) => Promise<void>
}) {
  const formatForInput = (dateStr?: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toISOString().slice(0, 16) // yyyy-MM-ddThh:mm
  }

  const [form, setForm] = useState({
    name: lib.name,
    phone: lib.phone || '',
    address: lib.address || '',
    subscription_status: lib.subscription_status,
    subscription_plan: lib.subscription_plan || '1m',
    subscription_start: formatForInput(lib.subscription_start),
    subscription_end: formatForInput(lib.subscription_end || lib.expires_at),
    delete_date: formatForInput(lib.delete_date),
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(lib.id, form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-brand-900">Edit Library</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'name', label: 'Library Name', type: 'text' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'address', label: 'Address', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={form.subscription_status}
                onChange={(e) => setForm((f) => ({ ...f, subscription_status: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Plan</label>
              <select
                value={form.subscription_plan}
                onChange={(e) => setForm((f) => ({ ...f, subscription_plan: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {['1m', '3m', '6m', '12m'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sub Start (Date & Time)</label>
              <input
                type="datetime-local"
                value={form.subscription_start}
                onChange={(e) => setForm((f) => ({ ...f, subscription_start: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sub End (Date & Time)</label>
              <input
                type="datetime-local"
                value={form.subscription_end}
                onChange={(e) => setForm((f) => ({ ...f, subscription_end: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Data Cleanup (Date & Time)</label>
            <input
              type="datetime-local"
              value={form.delete_date}
              onChange={(e) => setForm((f) => ({ ...f, delete_date: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────
function DeleteConfirm({
  lib,
  onClose,
  onConfirm,
}: {
  lib: Library
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    setDeleting(true)
    await onConfirm(lib.id)
    setDeleting(false)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Library?</h3>
        <p className="text-sm text-gray-500 mb-2">
          You are about to permanently delete:
        </p>
        <p className="text-base font-bold text-brand-900 mb-6">"{lib.name}"</p>
        <p className="text-xs text-red-500 font-medium mb-8">
          ⚠ This will delete all students, staff, seats, and auth accounts. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Expanded Detail Panel ─────────────────────────────────────────
function LibraryDetail({
  lib,
  onEdit,
  onDelete,
}: {
  lib: Library
  onEdit: (lib: Library) => void
  onDelete: (lib: Library) => void
}) {
  const expiryDate = lib.subscription_end || lib.expires_at
  const totalSeats = (lib.male_seats || 0) + (lib.female_seats || 0) + (lib.neutral_seats || 0)
  const totalLockers = (lib.male_lockers || 0) + (lib.female_lockers || 0) + (lib.neutral_lockers || 0)

  return (
    <div className="px-6 py-8 bg-gradient-to-b from-gray-50/80 to-white border-t border-gray-100 space-y-8">
      
      {/* Top Header with Actions & Countdowns */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {expiryDate && (
            <Countdown 
              targetDate={expiryDate} 
              label="Subscription Expires" 
              isUrgent={lib.subscription_status === 'expired'} 
            />
          )}
          {lib.delete_date && (
            <Countdown 
              targetDate={lib.delete_date} 
              label="Data Cleanup In" 
              isUrgent 
            />
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(lib)}
            className="flex items-center gap-2 px-5 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Library
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* ── Section 1: Library Identity ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader icon={<BookOpen className="w-3.5 h-3.5" />} title="Library Identity" />
          <div className="space-y-0.5">
            <div className="flex items-start gap-2 justify-between py-1.5 border-b border-gray-50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 w-32">Library ID</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-gray-600 break-all text-right">{lib.id}</span>
                <CopyButton text={lib.id} />
              </div>
            </div>
            <InfoRow label="Name" value={lib.name} />
            <InfoRow label="Address" value={lib.address} />
            <InfoRow label="City" value={lib.city} />
            <InfoRow label="State" value={lib.state} />
            <InfoRow label="Pincode" value={lib.pincode} />
            <InfoRow label="Phone" value={lib.phone} />
            <InfoRow label="Onboarding" value={lib.onboarding_done ? '✅ Done' : '⏳ Pending'} />
            <InfoRow label="Registered" value={format(new Date(lib.created_at), 'd MMM yyyy')} />
            {lib.updated_at && <InfoRow label="Last Updated" value={format(new Date(lib.updated_at), 'd MMM yyyy')} />}
          </div>
        </div>

        {/* ── Section 2: Owner ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader icon={<UserCircle className="w-3.5 h-3.5" />} title="Owner Details" />
          <div className="space-y-0.5">
            <InfoRow label="Owner ID" value={lib.owner_id} mono />
            <InfoRow label="Name" value={lib.owner_name} />
            <div className="flex items-start gap-2 justify-between py-1.5 border-b border-gray-50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 w-32">Email</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-800 font-medium text-right break-all">{lib.owner_email || '—'}</span>
                {lib.owner_email && <CopyButton text={lib.owner_email} />}
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                Password is securely hashed in Supabase Auth and cannot be displayed.
              </p>
            </div>
            {lib.owner_email && (
              <div className="flex gap-2 pt-3">
                <a
                  href={`mailto:${lib.owner_email}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors"
                >
                  <Mail className="w-3 h-3" /> Email
                </a>
                <a
                  href={`https://wa.me/91${lib.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
                >
                  <Phone className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Subscription ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader icon={<CreditCard className="w-3.5 h-3.5" />} title="Subscription" />
          <div className="space-y-0.5">
            <InfoRow label="Status" value={lib.subscription_status?.toUpperCase()} />
            <InfoRow label="Plan" value={lib.subscription_plan} />
            <InfoRow label="Original Price" value={lib.original_plan_price ? `₹${lib.original_plan_price}` : undefined} />
            <InfoRow label="Start Date" value={lib.subscription_start ? format(new Date(lib.subscription_start), 'd MMM yyyy') : undefined} />
            <InfoRow label="End Date" value={expiryDate ? format(new Date(expiryDate), 'd MMM yyyy') : undefined} />
            {expiryDate && (
              <InfoRow
                label="Days Left"
                value={Math.max(0, differenceInDays(new Date(expiryDate), new Date()))}
              />
            )}
            {lib.delete_date && (
              <div className="flex items-start gap-2 justify-between py-1.5">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider shrink-0 w-32">Delete Date</span>
                <span className="text-sm text-red-600 font-bold">{format(new Date(lib.delete_date), 'd MMM yyyy')}</span>
              </div>
            )}
            <InfoRow label="Data Cleared" value={lib.data_cleared ? '✅ Yes' : '❌ No'} />
          </div>
        </div>

        {/* ── Section 4: Seats & Capacity ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader icon={<LayoutGrid className="w-3.5 h-3.5" />} title="Seats & Lockers" />
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Seats — Total {(lib.male_seats || 0) + (lib.female_seats || 0) + (lib.neutral_seats || 0)}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Male', value: lib.male_seats, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Female', value: lib.female_seats, color: 'bg-pink-50 text-pink-700' },
                  { label: 'Neutral', value: lib.neutral_seats, color: 'bg-purple-50 text-purple-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl p-2.5 text-center ${color}`}>
                    <div className="text-lg font-bold">{value || 0}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {lib.is_gender_neutral ? '🔄 Gender Neutral Library' : '👥 Gendered Sections'}
              </p>
            </div>

            {lib.has_lockers && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Lockers — Total {totalLockers}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Male', value: lib.male_lockers, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Female', value: lib.female_lockers, color: 'bg-pink-50 text-pink-700' },
                    { label: 'Neutral', value: lib.neutral_lockers, color: 'bg-purple-50 text-purple-700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl p-2.5 text-center ${color}`}>
                      <div className="text-lg font-bold">{value || 0}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!lib.has_lockers && (
              <p className="text-sm text-gray-400 font-medium">No Lockers</p>
            )}
          </div>
        </div>

        {/* ── Section 5: Students ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="Students" />
          {lib.student_stats ? (
            <div className="space-y-3">
              <div className="text-center py-3 bg-brand-50 rounded-xl">
                <div className="text-3xl font-bold text-brand-700">{lib.student_stats.total}</div>
                <div className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mt-0.5">Total Active Students</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Male', value: lib.student_stats.male, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Female', value: lib.student_stats.female, color: 'bg-pink-50 text-pink-700' },
                  { label: 'Neutral', value: lib.student_stats.neutral, color: 'bg-purple-50 text-purple-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl p-2.5 text-center ${color}`}>
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
              {lib.student_stats.total > 0 && (
                <div className="pt-1">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                    {lib.student_stats.male > 0 && (
                      <div
                        className="h-full bg-blue-400 transition-all"
                        style={{ width: `${(lib.student_stats.male / lib.student_stats.total) * 100}%` }}
                      />
                    )}
                    {lib.student_stats.female > 0 && (
                      <div
                        className="h-full bg-pink-400 transition-all"
                        style={{ width: `${(lib.student_stats.female / lib.student_stats.total) * 100}%` }}
                      />
                    )}
                    {lib.student_stats.neutral > 0 && (
                      <div
                        className="h-full bg-purple-400 transition-all"
                        style={{ width: `${(lib.student_stats.neutral / lib.student_stats.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-medium">
                    <span className="text-blue-500">● Male</span>
                    <span className="text-pink-500">● Female</span>
                    <span className="text-purple-500">● Neutral</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No student data</p>
          )}
        </div>

        {/* ── Section 6: Staff ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm md:col-span-2 xl:col-span-1">
          <SectionHeader icon={<ShieldCheck className="w-3.5 h-3.5" />} title={`Staff (${lib.staff?.length || 0})`} />
          {lib.staff && lib.staff.length > 0 ? (
            <div className="space-y-3">
              {lib.staff.map((s) => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{s.auth_name || s.name}</p>
                      <p className="text-xs text-gray-500">{s.role || s.staff_type || 'staff'}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-600 font-medium break-all">{s.auth_email || s.email}</span>
                    {(s.auth_email || s.email) && <CopyButton text={s.auth_email || s.email} />}
                  </div>
                  {s.user_id && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-gray-400 font-mono break-all text-right">user: {s.user_id.slice(0, 16)}…</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[10px] text-amber-600 font-medium">Password hashed — not visible</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No staff members</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">Danger Zone</h4>
        </div>
        <div className="bg-red-50/50 border border-red-100 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h5 className="text-red-900 font-bold text-sm">Delete Entire Library Branch</h5>
            <p className="text-xs text-red-700/70 font-medium leading-relaxed max-w-2xl">
              This will permanently delete the library "{lib.name}", all assigned seats, lockers, 
              staff members, students, and their transaction history. <strong>This action is irreversible.</strong>
            </p>
          </div>
          <button
            onClick={() => onDelete(lib)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete Library
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Table ────────────────────────────────────────────────────
export default function LibrariesTable({ initialData }: { initialData: Library[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [editLib, setEditLib] = useState<Library | null>(null)
  const [deleteLib, setDeleteLib] = useState<Library | null>(null)

  const states = useMemo(() => {
    const s = new Set(data.map((l) => l.state))
    return Array.from(s).sort()
  }, [data])

  const filteredData = useMemo(() => {
    return data.filter((lib) => {
      const q = search.toLowerCase()
      const matchesSearch =
        lib.name.toLowerCase().includes(q) ||
        lib.city.toLowerCase().includes(q) ||
        (lib.owner_email || '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || lib.subscription_status === statusFilter
      const matchesState = stateFilter === 'all' || lib.state === stateFilter
      const matchesPlan = planFilter === 'all' || lib.subscription_plan === planFilter
      return matchesSearch && matchesStatus && matchesState && matchesPlan
    })
  }, [data, search, statusFilter, stateFilter, planFilter])

  const handleSave = useCallback(async (id: string, updates: Record<string, string>) => {
    try {
      await callEdgeFunction('admin-update-library', {
        body: { id, ...updates },
        useAdminToken: true
      })
      setData((prev) =>
        prev.map((lib) => (lib.id === id ? { ...lib, ...updates } : lib))
      )
    } catch (err) {
      console.error('Failed to update library:', err)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await callEdgeFunction('delete-library', {
        body: { id },
        useAdminToken: true
      })
      setData((prev) => prev.filter((lib) => lib.id !== id))
      setExpandedRow(null)
    } catch (err) {
      console.error('Failed to delete library:', err)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Modals */}
      {editLib && (
        <EditModal
          lib={editLib}
          onClose={() => setEditLib(null)}
          onSave={handleSave}
        />
      )}
      {deleteLib && (
        <DeleteConfirm
          lib={deleteLib}
          onClose={() => setDeleteLib(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, city, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-sm"
          />
        </div>
        {[
          {
            value: statusFilter,
            onChange: setStatusFilter,
            options: [['all', 'All Statuses'], ['active', 'Active'], ['expired', 'Expired'], ['deleted', 'Deleted']],
          },
          {
            value: stateFilter,
            onChange: setStateFilter,
            options: [['all', 'All States'], ...states.map((s) => [s, s])],
          },
          {
            value: planFilter,
            onChange: setPlanFilter,
            options: [['all', 'All Plans'], ['1m', '1 Month'], ['3m', '3 Months'], ['6m', '6 Months'], ['12m', '12 Months']],
          },
        ].map((sel, i) => (
          <select
            key={i}
            value={sel.value}
            onChange={(e) => sel.onChange(e.target.value)}
            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/10"
          >
            {sel.options.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Libraries', value: filteredData.length },
          { label: 'Active', value: filteredData.filter((l) => l.subscription_status === 'active').length, color: 'text-green-600' },
          { label: 'Expired', value: filteredData.filter((l) => l.subscription_status === 'expired').length, color: 'text-red-500' },
          {
            label: 'Total Students',
            value: filteredData.reduce((sum, l) => sum + (l.student_stats?.total || 0), 0),
            color: 'text-brand-600'
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Library', 'Location', 'Plan', 'Status', 'Students', 'Expires', 'Owner Email', ''].map((h) => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length > 0 ? (
                filteredData.map((lib) => {
                  const expiryDate = lib.subscription_end || lib.expires_at
                  const daysLeft = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null
                  const isExpiring = daysLeft !== null && daysLeft <= 7 && daysLeft > 0
                  const isPastExpiry = expiryDate ? isPast(new Date(expiryDate)) : false
                  // Compute effective status dynamically — DB field never auto-updates
                  const effectiveStatus = isPastExpiry ? 'expired' : lib.subscription_status
                  const isExpanded = expandedRow === lib.id

                  return (
                    <React.Fragment key={lib.id}>
                      <tr
                        className={`
                          hover:bg-gray-50/60 transition-all cursor-pointer group
                          ${isExpiring ? 'bg-amber-50/30' : ''}
                          ${isPastExpiry ? 'bg-red-50/20' : ''}
                          ${isExpanded ? 'bg-brand-50/30' : ''}
                        `}
                        onClick={() => setExpandedRow(isExpanded ? null : lib.id)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-900 text-sm">{lib.name}</span>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-brand-400 shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{lib.city}, {lib.state}</td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-1 bg-brand-50 text-brand-600 rounded-lg text-xs font-bold">{lib.subscription_plan || '1m'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={effectiveStatus} isExpiring={isExpiring} />
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-gray-700">
                          {lib.student_stats?.total ?? '—'}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium whitespace-nowrap">
                          {expiryDate ? (
                            <div className="flex flex-col gap-0.5">
                              <span className={isPastExpiry ? 'text-red-500 font-bold' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-600 font-bold' : 'text-gray-600'}>
                                {format(new Date(expiryDate), 'd MMM yyyy')}
                              </span>
                              <span className={`text-[10px] font-mono font-bold ${isPastExpiry ? 'text-red-400' : 'text-gray-400'}`}>
                                {format(new Date(expiryDate), 'h:mm:ss a')}
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{lib.owner_email || '—'}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditLib(lib) }}
                              className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteLib(lib) }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <LibraryDetail
                              lib={lib}
                              onEdit={setEditLib}
                              onDelete={setDeleteLib}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400 font-medium italic">
                    No libraries found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, isExpiring }: { status: string; isExpiring: boolean }) {
  if (isExpiring && status === 'active') {
    return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">⚠ Expiring</span>
  }
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    deleted: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.deleted}`}>
      ● {status}
    </span>
  )
}
