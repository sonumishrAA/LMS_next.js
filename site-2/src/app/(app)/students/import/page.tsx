'use client'
export const runtime = "edge";

import { useState, useEffect } from 'react'
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabaseBrowser } from '@/lib/supabase/client'
import { callEdgeFunction } from '@/lib/api'

interface LockerPolicy {
  eligible_combos: string[]
  monthly_fee: number
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const [policy, setPolicy] = useState<LockerPolicy | null>(null)
  const [loadingPolicy, setLoadingPolicy] = useState(true)

  useEffect(() => {
    async function fetchPolicy() {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data: staff } = await supabaseBrowser
        .from('staff')
        .select('library_ids')
        .eq('user_id', user.id)
        .single()

      const libId = document.cookie.match(/active_library_id=([^;]+)/)?.[1] || staff?.library_ids?.[0]

      if (libId) {
        const { data: lp } = await supabaseBrowser
          .from('locker_policies')
          .select('eligible_combos, monthly_fee')
          .eq('library_id', libId)
          .single()
        
        if (lp) setPolicy(lp)
      }
      setLoadingPolicy(false)
    }
    fetchPolicy()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await callEdgeFunction('import-students', {
        body: formData,
        method: 'POST'
      })
      setResult({
        success: data.success,
        message: data.message,
        details: data.details
      })
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to upload file. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-serif text-brand-900 leading-none">Import Students</h2>
        <p className="text-xs text-gray-500 font-medium">Bulk add students using a CSV file.</p>
      </div>

      {/* Step 1: Download Sample */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">1. Download Sample CSV</h3>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
              Download our template to ensure your data is in the correct format. 
            </p>
          </div>
        </div>
        <a 
          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zlhivlrapbhhkyrljueg.supabase.co'}/functions/v1/sample-csv`} 
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-brand-500 text-brand-500 font-bold text-xs hover:bg-brand-50 transition-colors active:scale-95"
        >
          Download Template.csv
        </a>
      </div>

      {/* Step 2: Upload File */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">2. Upload Filled CSV</h3>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
              Select your completed file. Max size 2MB. Only .csv supported.
            </p>
          </div>
        </div>

        <label className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
          file ? "border-brand-500 bg-brand-50/30" : "border-gray-200 bg-gray-50 hover:border-gray-300"
        )}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {file ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-brand-500 mb-2" />
                <p className="text-xs font-bold text-brand-700">{file.name}</p>
                <p className="text-[10px] text-brand-500">Click to change file</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500 font-medium">Click to select file</p>
              </>
            )}
          </div>
          <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} disabled={uploading} />
        </label>

        {file && !result && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-brand-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Import Students Now'}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className={cn(
          "p-5 rounded-2xl border space-y-3",
          result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-center gap-3">
            {result.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <h4 className={cn("text-sm font-bold", result.success ? "text-green-800" : "text-red-800")}>
              {result.success ? 'Import Successful' : 'Import Failed'}
            </h4>
          </div>
          <p className={cn("text-xs", result.success ? "text-green-700" : "text-red-700")}>{result.message}</p>
          {result.details && (
            <div className="bg-white/50 rounded-lg p-3 space-y-1">
              {Object.entries(result.details).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between text-[10px]">
                  <span className="text-gray-500 uppercase tracking-wider font-bold">{key.replace('_', ' ')}</span>
                  <span className="text-gray-900 font-black">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Locker Policy Rules */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-800">
          <Info className="w-4 h-4 text-brand-500" />
          <h4 className="text-[10px] font-bold uppercase tracking-widest">Library Policy & Rules</h4>
        </div>
        
        {loadingPolicy ? (
          <div className="animate-pulse flex space-y-2 flex-col">
            <div className="h-2 bg-gray-100 rounded w-3/4"></div>
            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
          </div>
        ) : policy ? (
          <div className="space-y-4">
            <div className="bg-brand-50 p-3 rounded-xl border border-brand-100">
              <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1">Locker Eligibility</p>
              <div className="flex flex-wrap gap-1.5">
                {policy.eligible_combos.map(combo => (
                  <span key={combo} className="bg-white px-2 py-0.5 rounded text-[9px] font-bold text-brand-600 border border-brand-200 font-mono">
                    {combo}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-brand-500 mt-2">
                Only students with these shift combinations can get a locker.
              </p>
            </div>
            
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly Locker Fee</span>
              <span className="text-sm font-black text-gray-900 font-mono">₹{policy.monthly_fee}</span>
            </div>

            <ul className="space-y-2 px-1">
              {[
                'Phone numbers must be exactly 10 digits.',
                'Admission date format: YYYY-MM-DD.',
                'Students are matched to empty seats automatically.'
              ].map((rule, i) => (
                <li key={i} className="flex gap-2 text-[10px] text-gray-500 leading-normal">
                  <span className="text-brand-500 font-black">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[10px] text-amber-600 italic">No locker policy configured for this library.</p>
        )}
      </div>
    </div>
  )
}
