# Welcome to your CDK TypeScript project

## Deploying 
Deploying process uses dockerhub to store docker container and then send it to aws ecs fargate.
You must login to docker hub using access key:
```
$ docker login -u <username>
```
and enter access key in prompt


## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


# Connecting to the database though bastion

1. Get the SSH key and bastion IP from outputs.

You can use `cdk deploy` if nothing changed, it just will prompt outputs.

OR After deployment, run the commands from your CDK outputs:

Get bastion IP (from CDK output)
```
BASTION_IP=$(aws cloudformation describe-stacks --stack-name YourStackName --query 'Stacks[0].Outputs[?OutputKey==`BastionPublicIP`].OutputValue' --output text)
```

Get SSH private key
```
aws ssm get-parameter --name /ec2/keypair/KEY_PAIR_ID --with-decryption --query Parameter.Value --output text > bastion-key.pem
chmod 400 bastion-key.pem
```

2. Setup ssh tunnel port from localhost:5432  to AuroraClusterEndpoint through bastion 18.153.68.156 (use your AuroraClusterEndpoint and your IP )
```
ssh -i bastion-key.pem -L 5432:boilerplatestack-boilerplateauroradbc4ff7a80-zolkr8gylbpk.cluster-cniqg8kg8g2s.eu-central-1.rds.amazonaws.com:5432 ec2-user@18.153.68.156 -N
```

3. Then use your db admin tool to connect to port localhost:5432
credentials (username, db, password) you must get from AWS console -> AWS Secrets Manager -> Secrets
or use aws cdk command
```
aws secretsmanager get-secret-value --secret-id <<secretName_from_config.ts>> --query SecretString --output text | jq '.'
```
for example
```
aws secretsmanager get-secret-value --secret-id boilerplate-db-credentials --query SecretString --output text | jq '.'
```

## Other  useful commands

get stack information: projectName = 'boilerplate' (from config.ts) Stack is created as new AppStack(app, '${projectName}Stack') (from infra.ts) So the final stack name is boilerplateStack
```
aws cloudformation describe-stacks --stack-name boilerplateStack
```

Connect to bastion
```
ssh -i bastion-key.pem ec2-user@18.153.68.156
```


fetch api key to connect from bastion to api
```
aws ssm get-parameter --name "/ec2/keypair/$(aws ec2 describe-key-pairs --key-names boilerplate-api-key --query 'KeyPairs[0].KeyPairId' --output text)" --with-decryption --query Parameter.Value --output text > boilerplate-api-key.pem
chmod 400 boilerplate-api-key.pem
```


login from bastion to api
```
ssh -i boilerplate-api-key.pem ec2-user@ec2-3-69-31-83.eu-central-1.compute.amazonaws.com
```