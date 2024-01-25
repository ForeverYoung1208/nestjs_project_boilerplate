module.exports = {
  apps: [
    {
      name: 'proj1_test',
      script: './dist/main.js',
      instances: 1,
      watch: true,
      env: {
        NODE_ENV: 'staging',
        IS_WORKER: 'false',
      },
    },
    {
      name: 'proj1_worker',
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
