import config from '@1stg/eslint-config'

export default [...config, { ignores: ['.wrangler/', 'public/'] }]
