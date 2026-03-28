import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'

const categories = [
  { key: 'gear', label: 'Gear', subcategories: ['Harnesses', 'Ropes', 'Helmets', 'Crash pads'], defaultBg: '#6a8a94', href: '/listings?category=Gear' },
  { key: 'shoes', label: 'Shoes', subcategories: ['Climbing shoes', 'Approach shoes', 'Mountain boots'], defaultBg: '#8a6a54', href: '/listings?category=Shoes' },
  { key: 'clothing', label: 'Clothing', subcategories: ['Jackets', 'Hoodies', 'Pants', 'T-Shirts'], defaultBg: '#6a7a5a', href: '/listings?category=Clothing' },
  { key: 'wall', label: 'Wall equipment', subcategories: ['Climbing holds', 'Safety mats', 'Wall materials'], defaultBg: '#7a8a9a', href: '/listings?category=Wall+equipment' },
]

export default async function Home() {
  const supabase = await createClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('listing_type', 'sell')
    .order('created_at', { ascending: false })
    .limit(4)

  const heroImageUrl = `${supabaseUrl}/storage/v1/object/public/hero-image/hero.jpg`
  const catImageUrls: Record<string, string> = {}
  categories.forEach(cat => {
    catImageUrls[cat.key] = `${supabaseUrl}/storage/v1/object/public/category-images/${cat.key}.jpg`
  })

  return (
    <HomeClient
      listings={listings || []}
      categories={categories}
      heroImageUrl={heroImageUrl}
      catImageUrls={catImageUrls}
    />
  )
}