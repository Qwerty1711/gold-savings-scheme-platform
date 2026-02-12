// app/(dashboard)/pulse/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PulsePage() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      redirect('/login')
    }

    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold">
          Welcome to Pulse, {user.email}
        </h1>
      </div>
    )
  } catch (err: any) {
    console.error('Error in PulsePage:', err)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">
          Server Error: {err.message}
        </p>
      </div>
    )
  }
}
