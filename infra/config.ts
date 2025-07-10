// define trarget environment 'development' | 'staging' | 'production'
export const targetNodeEnv: string = 'development';

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
export const projectShortName = 'boilerplate';

// define postfix for environment resources - don't change
let postfix = targetNodeEnv;
switch (targetNodeEnv) {
  case 'development':
    postfix = '-dev';
    break;
  case 'staging':
    postfix = '-stage';
    break;
  case 'production':
    postfix = ''; // no postfix
    break;
  default:
    break;
}
export const projectName = projectShortName + postfix;

// define your registered domain (you must have one at Route53)
export const domainName = 'for-test.click';

// subdomain for api (will be created)
export const subDomainNameApi = `api.${projectName}`;
export const fullSubDomainNameApi = `${subDomainNameApi}.${domainName}`;

// user for deployment using CI/CD (will be created)
export const userDeploerName = `${projectName}-deployer`;

// database name
export const databaseName = projectShortName + postfix.replace('-', ''); // DatabaseName must begin with a letter and contain only alphanumeric characters
export const databaseUsername = 'postgres';
export const companyName = 'Some Test Company Inc';
