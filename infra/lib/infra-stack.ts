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
import * as targets from 'aws-cdk-lib/aws-route53-targets';
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
     *
     *
     *
     * COMMON
     *
     *
     *
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
     *
     *
     *
     * NETWORKS
     *
     *
     *
     */

    // VPC
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2, // Need 2 AZs for Aurora
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 23,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Use PRIVATE_ISOLATED instead of PRIVATE_WITH_EGRESS - no need for aura and redis to access internet
        },
      ],
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

    const workerSecurityGroup = new ec2.SecurityGroup(
      this,
      'WorkerSecurityGroup',
      {
        vpc,
        description: 'Security group for Worker',
      },
    );

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
     *
     *
     *
     * DATABASE
     *
     *
     *
     */

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_15_7,
    });
    // Aurora PostgreSQL Serverless
    const dbSecurityGroup = new ec2.SecurityGroup(
      this,
      'DatabaseSecurityGroup',
      {
        vpc,
        description: 'Security group for RDS',
        allowAllOutbound: true,
      },
    );

    dbSecurityGroup.addIngressRule(
      apiSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from API',
    );
    const dbCluster = new rds.DatabaseCluster(this, 'AuroraDB', {
      engine,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
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

    // assign necessary access permissions
    dbCluster.connections.allowFrom(
      apiSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow database access from API',
    );

    dbCluster.connections.allowFrom(
      workerSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow database access from Worker',
    );

    /**
     *
     *
     *
     *  QUEUE
     *
     *
     *
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
          subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
        },
      ).ref,
    });

    /**
     *
     *
     *
     *  API
     *
     *
     *
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
        'src',
        'test',
        '.env*',
        '**/*.spec.ts',
        // add any other files/folders you want to exclude
      ],
      bundling: {
        image: cdk.DockerImage.fromRegistry(
          'public.ecr.aws/docker/library/node:22',
        ),
        user: 'root',
        command: [
          'bash',
          '-c',
          [
            'set -ex', // Enable debugging output
            'cp /asset-input/package*.json /asset-output/',
            'cd /asset-output',
            'npm i -g @nestjs/cli',
            'npm ci --production',
            'cp -r /asset-input/src /asset-output/',
            'cp -r /asset-input/tsconfig*.json /asset-output/',
            'npm run build',
            'rm -rf src/ tsconfig*.json', // Remove source files after build
            'rm -rf node_modules/@types', // Remove type definitions to reduce size
          ].join(' && '),
        ],
      },
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
            namespace: 'aws:ec2:vpc',
            optionName: 'Subnets',
            value: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
          },
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
        tier: {
          // Add this tier configuration
          name: 'Worker',
          type: 'SQS/HTTP',
        },
        optionSettings: [
          ...commonOptionSettings,
          {
            namespace: 'aws:ec2:vpc',
            optionName: 'Subnets',
            value: vpc.isolatedSubnets
              .map((subnet) => subnet.subnetId)
              .join(','),
          },
          {
            namespace: 'aws:ec2:vpc',
            optionName: 'AssociatePublicIpAddress',
            value: 'false', // This disables public IP assignment
          },
          {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'SecurityGroups',
            value: workerSecurityGroup.securityGroupId,
          },
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
     *
     *
     *
     * Bastion instance for debugging purposes
     *
     *
     *
     */
    const bastionSecurityGroup = new ec2.SecurityGroup(
      this,
      'BastionSecurityGroup',
      {
        vpc,
        description: 'Security group for Bastion Host',
        allowAllOutbound: true,
      },
    );
    // Allow SSH access
    bastionSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      // ec2.Peer.ipv4('YOUR_IP_ADDRESS/32'),  // Replace with your IP address if want to restrict
      ec2.Port.tcp(22),
      'Allow SSH',
    );
    // Add this after VPC definition but before the bastion host
    const keyPair = new ec2.CfnKeyPair(this, 'BastionKeyPair', {
      keyName: `${projectName}-bastion-key`,
    });

    // Create bastion host
    const bastion = new ec2.Instance(this, 'BastionHost', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Place in public subnet
      },
      securityGroup: bastionSecurityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.NANO,
      ), // Cheapest ARM instance
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64, // ARM for t4g.nano
      }),
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        'BastionKeyPairReference',
        keyPair.keyName,
      ),
    });

    // Allow bastion to access Aurora
    dbSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Bastion',
    );

    // Allow bastion to access Redis
    redisSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis access from Bastion',
    );

    /**
     *
     *
     *
     * Finalize access and dependancies
     *
     *
     *
     */

    new route53.ARecord(this, 'ApiAlias', {
      zone,
      recordName: subDomainNameApi,
      target: route53.RecordTarget.fromAlias(
        new targets.ElasticBeanstalkEnvironmentEndpointTarget(
          `${apiEnvironment.environmentName}.${this.region}.elasticbeanstalk.com`,
        ),
      ),
    });

    // Add explicit dependencies
    workerEnvironment.addDependency(
      workerSecurityGroup.node.defaultChild as cdk.CfnResource,
    );
    workerEnvironment.addDependency(vpc.node.defaultChild as cdk.CfnResource);

    // Also add dependency for API environment
    apiEnvironment.addDependency(
      apiSecurityGroup.node.defaultChild as cdk.CfnResource,
    );
    apiEnvironment.addDependency(vpc.node.defaultChild as cdk.CfnResource);

    workerEnvironment.addDependency(
      // addDependency expects a CfnResource type, but DatabaseCluster is a higher-level construct. Access the underlying CloudFormation resource using the node.defaultChild property
      dbCluster.node.defaultChild as cdk.CfnResource,
    );
    workerEnvironment.addDependency(redis);

    /**
     *
     *
     *
     *  Outputs
     *
     *
     *
     */
    // Bastion's public IP to connect
    new cdk.CfnOutput(this, 'BastionPublicIP', {
      value: bastion.instancePublicIp,
    });

    // Output the private key using Fn.getAtt
    new cdk.CfnOutput(this, 'BastionSSHKeyOutput', {
      value: cdk.Fn.getAtt(keyPair.logicalId, 'PrivateKey').toString(),
      description: 'Private key for SSH access to bastion host',
    });
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
