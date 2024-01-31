module.exports = {
  apps: [
    {
      name: 'udk_api',
      script: './dist/main.js',
      instances: 1,
      watch: true,
      env: {
        NODE_ENV: 'staging',
      },
    },
    {
      name: 'udk_worker',
      script: './dist/worker.js',
      instances: 1,
      watch: true,
      env: {
        NODE_ENV: 'staging',
      },
    },
  ],
};
