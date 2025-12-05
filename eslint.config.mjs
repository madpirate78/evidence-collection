import nextConfig from 'eslint-config-next'
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextConfig,
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Allow setState in useEffect for hydration patterns
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]

export default eslintConfig
