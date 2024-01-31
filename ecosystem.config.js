module.exports = {
  apps: [
    {
      name: 'udk_test',
      script: './dist/main.js',
      instances: 1,
      watch: true,
      env: {
        NODE_ENV: 'staging',
        IS_WORKER: 'false',
      },
    },
    {
      name: 'udk_worker',
      script: './dist/main.js',
      instances: 1,
      watch: true,
      env: {
        NODE_ENV: 'staging',
        IS_WORKER: 'true',
      },
    },
  ],
};
