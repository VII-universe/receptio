import type { DemoIndustry } from '@/lib/marketing/demo'
import { IconCup, IconScissors, IconTooth, IconWrench } from './icons'

/** Ikona a barevný nádech odvětví (nádech přebírá i orb Aidy při přepnutí ukázky). */
export const INDUSTRY_META: Record<DemoIndustry, { Icon: typeof IconCup; tint: string }> = {
  restaurant: { Icon: IconCup, tint: '#ff8a4c' },
  dental: { Icon: IconTooth, tint: '#6fc7b4' },
  auto: { Icon: IconWrench, tint: '#f2b84b' },
  salon: { Icon: IconScissors, tint: '#f08fae' },
}
