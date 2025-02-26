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
