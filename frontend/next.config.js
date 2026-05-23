/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    ORION_URL:          process.env.ORION_URL          || 'http://localhost:1026',
    QL_URL:             process.env.QL_URL             || 'http://localhost:8668',
    KEYROCK_URL:        process.env.KEYROCK_URL        || 'http://localhost:3005',
    WEBHOOK_URL:        process.env.WEBHOOK_URL        || 'http://localhost:5051',
    FIWARE_SERVICE:     process.env.FIWARE_SERVICE     || 'irfane',
    FIWARE_SERVICEPATH: process.env.FIWARE_SERVICEPATH || '/smartcity',
  },
}
module.exports = nextConfig