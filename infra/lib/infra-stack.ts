import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { buildDocker } from './build-docker';
import { Construct } from 'constructs';
import {
  databaseName,
  dockerHubImage,
  domainName,
  projectName,
  subDomainNameApi,
  userDeploerName,
  secretName,
  databaseUsername,
  nodeEnv,
  companyName,
} from '../config';

export class BoilerplateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * COMMON
     */
    const shouldBuildDocker =
      this.node.tryGetContext('buildDocker') !== 'false';
    if (shouldBuildDocker) {
      try {
        buildDocker();
      } catch (error) {
        console.error('Failed to build and push Docker image:', error);
        throw error;
      }
    } else {
      console.log('Skipping Docker build step');
    }

    // Add tag for cost tracking
    cdk.Tags.of(this).add('AppManagerCFNStackKey', this.stackName);

    // Add IAM user to deploy code
    const userDeploer = new iam.User(this, `${projectName}Deployer`, {
      userName: userDeploerName,
    });

    /**
     * NETWORKS
     */

    // VPC
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Security Group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSG', {
      vpc,
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic',
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic',
    );

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
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

    // Add API subdomain to the zone
    new route53.ARecord(this, 'ApiDNS', {
      zone,
      recordName: subDomainNameApi,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(alb),
      ),
    });

    // HTTPS Listener
    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      open: true,
    });

    // HTTP Listener (Redirect to HTTPS)
    alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
      }),
    });

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
     *  API
     */

    // API Security groups
    const apiSecurityGroup = new ec2.SecurityGroup(this, 'ApiSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for api',
    });
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic',
    );
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic',
    );

    // API Cluster
    const apiCluster = new ecs.Cluster(this, 'ApiCluster', {
      vpc,
    });

    // API Task Role (task for Api Cluster)
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy',
        ),
      ],
    });

    // API Fargate Service (Single Instance, No Auto-Scaling)
    const apiTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      'ApiTaskDef',
      { taskRole },
    );

    const mailPasswordSecret = new secretsmanager.Secret(
      this,
      'MailPasswordSecret',
      {
        description: 'Mail password for the API service',
      },
    );
    mailPasswordSecret.grantRead(apiTaskDefinition.taskRole);

    apiTaskDefinition.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromRegistry(dockerHubImage),
      command: ['/bin/sh', '-c', 'npm run migration:run && npm run start:prod'],
      memoryLimitMiB: 512,
      cpu: 256,
      environment: {
        PORT: '3000',
        NODE_ENV: nodeEnv,
        SITE_ORIGIN: `https://${subDomainNameApi}`,
        DB_HOST: dbCluster.clusterEndpoint.hostname,
        DB_PORT: '5432',
        DB_DATABASE: databaseName,
        // REDIS_HOST: set at the redis section below
        // REDIS_PORT: set at the redis section below
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
      },
      secrets: {
        // Get credentials from Secrets Manager
        MAIL_PASSWORD: ecs.Secret.fromSecretsManager(mailPasswordSecret),
        DB_USERNAME: ecs.Secret.fromSecretsManager(
          dbCluster.secret!,
          'username',
        ),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(
          dbCluster.secret!,
          'password',
        ),
      },
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'api-container',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      cluster: apiCluster,
      taskDefinition: apiTaskDefinition,
      desiredCount: 1,
      securityGroups: [apiSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(60), // Give time for DB connection
    });

    // Make service depend on DB cluster
    apiService.node.addDependency(dbCluster);

    // Attach API Service to Load Balancer via HTTPS
    httpsListener.addTargets('ApiTarget', {
      port: 80,
      targets: [
        apiService.loadBalancerTarget({
          containerName: 'ApiContainer',
          containerPort: 3000,
        }),
      ],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(30),
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 3,
      },
    });

    // Allow API Service to connect to DB
    // todo take port from config or .env
    dbCluster.connections.allowFrom(apiSecurityGroup, ec2.Port.tcp(5432));

    /**
     *  QUEUE
     */

    // ElastiCache Redis
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc,
      allowAllOutbound: true,
    });

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

    // Allow API to access Redis
    redisSecurityGroup.addIngressRule(
      apiSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis traffic from API',
    );

    // Update the container environment variables
    const apiContainer = apiTaskDefinition.findContainer('ApiContainer');
    if (apiContainer) {
      apiContainer.addEnvironment('REDIS_HOST', redis.attrRedisEndpointAddress);
      apiContainer.addEnvironment('REDIS_PORT', redis.attrRedisEndpointPort);
    }
  }
}
