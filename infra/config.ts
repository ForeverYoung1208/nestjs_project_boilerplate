// project name (any) - will be used as part of naming for some resources like docker image, database, etc.
export const projectName = 'boilerplate6';

// define your registered domain (you must have one at Route53)
export const domainName = 'for-test.click';

// subdomain for api (will be created)
export const subDomainNameApi = `api.${projectName}.${domainName}`;

// user for deployment using CI/CD (will be created)
export const userDeploerName = `${projectName}-deployer`;

// database name
export const databaseName = projectName;
export const databaseUsername = 'postgres';
export const secretName = `${projectName}-db-credentials`;
export const nodeEnv = 'development';
export const companyName = 'Some Test Company Inc'