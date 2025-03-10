import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import {
  databaseName,
  domainName,
  projectName,
  subDomainNameApi,
  userDeploerName,
  secretName,
  databaseUsername,
  companyName,
  nodeEnv,
} from '../config';

export class BoilerplateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * COMMON
     */

    // Add tag for cost tracking
    cdk.Tags.of(this).add('AppManagerCFNStackKey', this.stackName);

    // Add IAM user to deploy code
    const userDeploer = new iam.User(this, `${projectName}Deployer`, {
      userName: userDeploerName,
    });

    const mailPasswordSecret = new secretsmanager.Secret(
      this,
      'MailPasswordSecret',
      {
        description: 'Mail password for the API service',
      },
    );

    /**
     * NETWORKS
     */

    // VPC
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    //Lookup the zone based on domain name
    const zone = route53.HostedZone.fromLookup(this, `${projectName}Zone`, {
      domainName: domainName,
    });

    // ACM Certificate
    const certificate = new certificatemanager.Certificate(this, 'ALBCert', {
      domainName: subDomainNameApi,
      validation: certificatemanager.CertificateValidation.fromDns(zone),
    });

    const apiSecurityGroup = new ec2.SecurityGroup(this, 'ApiSecurityGroup', {
      vpc,
      description: 'Serurity group for API',
      allowAllOutbound: true,
    });

    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow http',
    );
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow https',
    );

    /**
     * DATABASE
     */

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_15_7,
    });
    // Aurora PostgreSQL Serverless
    const dbCluster = new rds.DatabaseCluster(this, 'AuroraDB', {
      engine,
      vpc,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0.5, // Minimum ACU (0.5 is the minimum?)
      serverlessV2MaxCapacity: 1, // Maximum ACU
      parameterGroup: new rds.ParameterGroup(this, 'ParameterGroup', {
        engine,
        parameters: {
          // Terminate idle session for Aurora Serverless V2 auto-pause
          idle_session_timeout: '60000',
        },
      }),

      defaultDatabaseName: databaseName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      credentials: rds.Credentials.fromGeneratedSecret(databaseUsername, {
        secretName,
      }),
    });

    // workaround to set minimum capacity to 0 to allow full stop of the database if not used
    (dbCluster.node.defaultChild as cdk.CfnResource).addPropertyOverride(
      'ServerlessV2ScalingConfiguration.MinCapacity',
      0,
    );

    /**
     *  QUEUE
     */

    // ElastiCache Redis
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc,
      allowAllOutbound: true,
    });
    // Add security group rule to allow Redis access
    redisSecurityGroup.addIngressRule(
      apiSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis access from API and Worker',
    );

    const redis = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: new elasticache.CfnSubnetGroup(
        this,
        'RedisSubnetGroup',
        {
          description: 'Subnet group for Redis cluster',
          subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
        },
      ).ref,
    });

    /**
     *  API
     */

    // Create an S3 asset for application code

    const appAsset = new s3assets.Asset(this, 'ApiAsset', {
      path: '../', // Point to parent directory
      exclude: [
        '.git',
        '.github',
        '.vscode',
        'docker',
        'infra', // exclude CDK infrastructure code
        'node_modules', // exclude node_modules as we'll install them on the instance
        'src',
        'test',
        '.env*',
        '**/*.spec.ts',
        // add any other files/folders you want to exclude
      ],
    });

    // Create IAM role for EC2 instances
    const ebInstanceRole = new iam.Role(this, 'EBInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AWSElasticBeanstalkWebTier',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AWSElasticBeanstalkWorkerTier',
        ),
      ],
    });

    // Create instance profile
    const ebInstanceProfile = new iam.CfnInstanceProfile(
      this,
      'EBInstanceProfile',
      {
        roles: [ebInstanceRole.roleName],
      },
    );

    // Create Elastic Beanstalk application
    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: `${projectName}-application`,
    });
    if (!app.applicationName) {
      throw new Error('app.applicationName is undefined');
    }

    const versionLabel = this.createApplicationVersion(
      app,
      'AppVersion',
      appAsset,
    );

    // Create API environment

    const commonEnvVars = [
      ...this.createEnvironmentVariables({
        NODE_ENV: nodeEnv,
        PORT: '3000',
        SITE_ORIGIN: `https://${subDomainNameApi}`,
        DB_HOST: dbCluster.clusterEndpoint.hostname,
        DB_PORT: dbCluster.clusterEndpoint.port.toString(),
        DB_DATABASE: databaseName,
        REDIS_HOST: redis.attrRedisEndpointAddress,
        REDIS_PORT: redis.attrRedisEndpointPort,
        TYPEORM_LOGGING: 'false',
        API_KEY: 'asdfasdf',
        MAILER_TRANSPORT: 'smtp',
        MAIL_HOST: 'smtp-pulse.com',
        MAIL_PORT: '2525',
        MAIL_ENCRYPTION: 'false',
        MAIL_TLS: 'true',
        MAIL_USERNAME: 'siafin2010@gmail.com',
        MAIL_FROM_EMAIL: 'ihor.shcherbyna@clockwise.software',
        COMPANY_NAME: companyName,
        // todo: read stuff from .env
      }),

      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'MAIL_PASSWORD',
        value: `{{resolve:secretsmanager:${mailPasswordSecret.secretArn}}}`,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'DB_USERNAME',
        value: `{{resolve:secretsmanager:${dbCluster.secret!.secretArn}:SecretString:username}}`,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'DB_PASSWORD',
        value: `{{resolve:secretsmanager:${dbCluster.secret!.secretArn}:SecretString:password}}`,
      },
    ];

    const commonOptionSettings: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] =
      [
        {
          namespace: 'aws:ec2:vpc',
          optionName: 'VPCId',
          value: vpc.vpcId,
        },
        {
          namespace: 'aws:ec2:vpc',
          optionName: 'Subnets',
          value: vpc.privateSubnets.map((subnet) => subnet.subnetId).join(','),
        },
        {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: ebInstanceProfile.attrArn,
        },
        {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MinSize',
          value: '1',
        },
        {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MaxSize',
          value: '1',
        },
        {
          namespace: 'aws:ec2:instances',
          optionName: 'InstanceTypes',
          value: 't4g.micro',
        },
        {
          namespace: 'aws:elasticbeanstalk:environment',
          optionName: 'EnvironmentType',
          value: 'SingleInstance', // This ensures single instance deployment
        },
        {
          namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
          optionName: 'StreamLogs',
          value: 'true',
        },
        {
          namespace: 'aws:elasticbeanstalk:cloudwatch:logs:health',
          optionName: 'HealthStreamingEnabled',
          value: 'true',
        },
      ];

    const apiEnvironment = new elasticbeanstalk.CfnEnvironment(
      this,
      'ApiEnvironment',
      {
        environmentName: `${projectName}-Api-Environment`,
        applicationName: app.applicationName,
        solutionStackName: '64bit Amazon Linux 2023 v6.4.3 running Node.js 22', // Choose appropriate platform
        optionSettings: [
          ...commonOptionSettings,
          {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'SecurityGroups',
            value: apiSecurityGroup.securityGroupId,
          },
          ...commonEnvVars,
        ],
        versionLabel,
      },
    );

    // Create Worker environment
    const workerEnvironment = new elasticbeanstalk.CfnEnvironment(
      this,
      'WorkerEnvironment',
      {
        environmentName: `${projectName}-Worker-Environment`,
        applicationName: app.applicationName,
        solutionStackName: '64bit Amazon Linux 2023 v6.4.3 running Node.js 22', // Choose appropriate platform
        optionSettings: [
          ...commonOptionSettings,
          {
            namespace: 'aws:elasticbeanstalk:application:environment',
            optionName: 'MODE',
            value: 'WORKER',
          },
          ...commonEnvVars,
        ],
        versionLabel,
      },
    );

    /**
     * Finalize access and dependancy
     */

    // assign necessary access permissions
    dbCluster.connections.allowFrom(
      apiSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow database access from API',
    );

    new route53.CnameRecord(this, 'ApiCname', {
      zone,
      recordName: subDomainNameApi,
      domainName: apiEnvironment.attrEndpointUrl,
    });

    workerEnvironment.addDependency(
      // addDependency expects a CfnResource type, but DatabaseCluster is a higher-level construct. Access the underlying CloudFormation resource using the node.defaultChild property
      dbCluster.node.defaultChild as cdk.CfnResource,
    );
    workerEnvironment.addDependency(redis);
  }

  private createApplicationVersion(
    app: elasticbeanstalk.CfnApplication,
    versionLabel: string,
    asset: s3assets.Asset,
  ): string {
    if (!app.applicationName) {
      throw new Error('app.applicationName is undefined');
    }
    const version = new elasticbeanstalk.CfnApplicationVersion(
      this,
      versionLabel,
      {
        applicationName: app.applicationName,
        sourceBundle: {
          s3Bucket: asset.s3BucketName,
          s3Key: asset.s3ObjectKey,
        },
      },
    );
    version.addDependency(app);
    return version.ref;
  }

  private createEnvironmentVariables(envVars: Record<string, string>) {
    return Object.entries(envVars).map(([key, value]) => ({
      namespace: 'aws:elasticbeanstalk:application:environment',
      optionName: key,
      value: value,
    }));
  }
}
