export const generateSitemap = (routes: string[]): string => {
  const baseUrl = 'https:
  const currentDate = new Date().toISOString().split('T')[0];
  const urlEntries = routes.map(route => `
    <url>
      <loc>${baseUrl}${route}</loc>
      <lastmod>${currentDate}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${route === '/' ? '1.0' : '0.8'}</priority>
    </url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http:
  ${urlEntries}
</urlset>`;
};
