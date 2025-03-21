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

export class AppStack extends cdk.Stack {
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
      `${projectName}MailPasswordSecret`,
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
    const vpc = new ec2.Vpc(this, `${projectName}VPC`, {
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
    const certificate = new certificatemanager.Certificate(
      this,
      `${projectName}Certificate`,
      {
        domainName: subDomainNameApi,
        validation: certificatemanager.CertificateValidation.fromDns(zone),
      },
    );

    const apiSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}ApiSecurityGroup`,
      {
        vpc,
        description: 'Serurity group for API',
        allowAllOutbound: true,
      },
    );

    const workerSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}WorkerSecurityGroup`,
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

    // todo: remove after debugging
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow ssh',
    );
    // ^^^

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
      `${projectName}DatabaseSecurityGroup`,
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
    const dbCluster = new rds.DatabaseCluster(this, `${projectName}AuroraDB`, {
      engine,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0.5, // Minimum ACU (0.5 is the minimum?)
      serverlessV2MaxCapacity: 1, // Maximum ACU
      parameterGroup: new rds.ParameterGroup(
        this,
        `${projectName}RdsParameterGroup`,
        {
          engine,
          parameters: {
            // Terminate idle session for Aurora Serverless V2 auto-pause
            idle_session_timeout: '60000',
          },
        },
      ),

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
    const redisSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}RedisSG`,
      {
        vpc,
        allowAllOutbound: true,
      },
    );
    // Add security group rule to allow Redis access
    redisSecurityGroup.addIngressRule(
      apiSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis access from API and Worker',
    );

    const redis = new elasticache.CfnCacheCluster(
      this,
      `${projectName}RedisCluster`,
      {
        cacheNodeType: 'cache.t3.micro',
        engine: 'redis',
        numCacheNodes: 1,
        vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: new elasticache.CfnSubnetGroup(
          this,
          `${projectName}RedisSubnetGroup`,
          {
            description: 'Subnet group for Redis cluster',
            subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
          },
        ).ref,
      },
    );

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

    const appAsset = new s3assets.Asset(this, `${projectName}ApiAsset`, {
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
            // Copy only files (not directories) from input to output
            'find /asset-input -maxdepth 1 -type f -exec cp {} /asset-output/ \\;',
            'cd /asset-output',
            'npm i -g @nestjs/cli',
            'npm ci --production',
            'cp -r /asset-input/src /asset-output/',
            'npm run build',
          ].join(' && '),

          // [
          //   'set -ex', // Enable debugging output
          //   'npm i -g @nestjs/cli',
          //   'npm ci --production',
          //   'cp -r /asset-input/src /asset-output/',
          //   'cp -r /asset-input/tsconfig*.json /asset-output/',
          //   'npm run build',
          //   'rm -rf src/ tsconfig*.json', // Remove source files after build
          //   'rm -rf node_modules/@types', // Remove type definitions to reduce size
          // ].join(' && '),
        ],
      },
    });

    // Create IAM role for EC2 instances
    const ebInstanceRole = new iam.Role(this, `${projectName}EBInstanceRole`, {
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
      `${projectName}EBInstanceProfile`,
      {
        roles: [ebInstanceRole.roleName],
      },
    );

    // Create Elastic Beanstalk application
    const app = new elasticbeanstalk.CfnApplication(
      this,
      `${projectName}Application`,
      {
        applicationName: `${projectName}-application`,
      },
    );
    if (!app.applicationName) {
      throw new Error('app.applicationName is undefined');
    }

    const versionLabel = this.createApplicationVersion(
      app,
      `${projectName}AppVersion`,
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
          value: 't2.nano',
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

    const keyPairApi = new ec2.CfnKeyPair(this, `${projectName}ApiKeyPair`, {
      keyName: `${projectName}-api-key`,
    });

    const apiEnvironment = new elasticbeanstalk.CfnEnvironment(
      this,
      `${projectName}ApiEnvironment`,
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
          {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'EC2KeyName',
            value: keyPairApi.keyName,
          },
          ...commonEnvVars,
        ],
        versionLabel,
      },
    );

    // Create Worker environment
    const workerEnvironment = new elasticbeanstalk.CfnEnvironment(
      this,
      `${projectName}WorkerEnvironment`,
      {
        environmentName: `${projectName}-Worker-Environment`,
        applicationName: app.applicationName,
        solutionStackName: '64bit Amazon Linux 2023 v6.4.3 running Node.js 22', // Choose appropriate platform
        // tier: {
        //   name: 'Worker',
        //   type: 'SQS/HTTP',
        // },
        optionSettings: [
          ...commonOptionSettings,
          {
            namespace: 'aws:ec2:vpc',
            optionName: 'Subnets',
            value: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','), // need internet access to send emails to some smtp service
          },
          // {
          //   namespace: 'aws:ec2:vpc',
          //   optionName: 'AssociatePublicIpAddress',
          //   value: 'false', // This disables public IP assignment
          // },
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
      `${projectName}BastionSecurityGroup`,
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
    const keyPair = new ec2.CfnKeyPair(this, `${projectName}BastionKeyPair`, {
      keyName: `${projectName}-bastion-key`,
    });

    // Create bastion host
    const bastion = new ec2.Instance(this, `${projectName}BastionHost`, {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Place in public subnet
      },
      securityGroup: bastionSecurityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.NANO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
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

    // Allow bastion to access Api
    apiSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(22),
      'Allow Redis access from Bastion',
    );

    // Allow bastion to access Worker
    workerSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(22),
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

    // new route53.ARecord(this, `${projectName}ApiAlias`, {
    //   zone,
    //   recordName: subDomainNameApi,
    //   target: route53.RecordTarget.fromIpAddresses(
    //     apiEnvironment.attrEndpointUrl,
    //   ),
    // });

    new route53.CnameRecord(this, `${projectName}ApiAlias`, {
      zone,
      recordName: subDomainNameApi,
      domainName: apiEnvironment.attrEndpointUrl,
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

    // Output just the key name instead of trying to get the private key
    new cdk.CfnOutput(this, 'BastionSSHKeyOutput', {
      value: keyPair.keyName,
      description:
        'Key pair name for SSH access to bastion host. Get the private key from SSM Parameter Store.',
    });
    new cdk.CfnOutput(this, 'ApiSSHKeyOutput', {
      value: keyPairApi.keyName,
      description:
        'Key pair name for SSH access to bastion host. Get the private key from SSM Parameter Store.',
    });

    // Add output for the command to retrieve the private key
    new cdk.CfnOutput(this, 'SSHKeyCommand', {
      value: `aws ssm get-parameter --name /ec2/keypair/${keyPair.getAtt('KeyPairId')} --with-decryption --query Parameter.Value --output text`,
      description: 'Command to get the private key from SSM Parameter Store',
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
