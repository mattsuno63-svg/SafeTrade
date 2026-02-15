/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sharp per upload/ottimizzazione immagini (raccomandato per Vercel)
  serverExternalPackages: ['sharp'],
  // Disabilita output file tracing per evitare RangeError con micromatch
  // Questo è un workaround noto per problemi di build su Vercel
  outputFileTracing: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iltjqmorddgrkterjezj.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    // Disabilita ottimizzazione immagini per domini non specificati
    unoptimized: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Assicurati che Sharp non venga incluso nel bundle client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
      }
    }
    
    // Escludi Sharp completamente dalla risoluzione durante il build
    // Questo previene problemi con micromatch durante build trace collection
    if (isServer) {
      config.externals = config.externals || []
      // Usa array invece di object per externals
      if (Array.isArray(config.externals)) {
        config.externals.push('sharp')
      } else {
        config.externals = [config.externals, 'sharp']
      }
    }
    
    return config
  },
}

module.exports = nextConfig

