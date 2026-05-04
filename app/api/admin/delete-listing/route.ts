import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // Verify the caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { listingId, imageUrls } = await req.json()
  if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })

  // Delete images from storage
  if (imageUrls && imageUrls.length > 0) {
    const paths = imageUrls.map((url: string) => {
      const parts = url.split('/listing-images/')
      return parts[1] || ''
    }).filter(Boolean)
    if (paths.length > 0) await supabaseAdmin.storage.from('listing-images').remove(paths)
  }

  // Delete listing (bypasses RLS via service role)
  const { error } = await supabaseAdmin.from('listings').delete().eq('id', listingId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
