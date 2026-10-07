import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Odkazy a navigace pro marketing stránky (locale v URL).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
