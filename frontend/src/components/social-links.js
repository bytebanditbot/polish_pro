export const socialLinks = [
  { label: 'Instagram', type: 'instagram', href: 'https://www.instagram.com/' },
  { label: 'TikTok', type: 'tiktok', href: 'https://www.tiktok.com/' },
  { label: 'Facebook', type: 'facebook', href: 'https://www.facebook.com/' },
  { label: 'YouTube', type: 'youtube', href: 'https://www.youtube.com/' },
  { label: 'X', type: 'x', href: 'https://x.com/' },
  { label: 'Snapchat', type: 'snapchat', href: 'https://www.snapchat.com/' },
]

export function getSocialLinks(customLinks) {
  return socialLinks
    .map((link) => ({ ...link, href: customLinks?.[link.type] || link.href }))
}
