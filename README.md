

## MIGRATIONS

run migrations in docker's bash
```bash
$ docker compose -f docker/docker-compose.yml exec api bash
```
or change .env param  `DB_HOST=postgres` to `DB_HOST=localhost` to make postrges accesible locally
don't forget to build project (`npm run build`) every tyime before generating or running migrtions because they run using built data (/dist)

### create new empty migration with name 'asdf'.
```bash
$ npm run migration:create --name=asdf
```

### generate new migration  with name 'asdf' from schema changes.
```bash
$ npm run migration:generate --name=asdf
```

### Run all new migrations:
```bash
$ npm run migration:run
```

### Revert last migration:
```bash
$ npm run migration:revert
```
## connections

### connect to the bastion host
```bash
$ aws ssm get-parameter --name /ec2/keypair/key-0d617db5fbc3f6c67 --with-decryption --query Parameter.Value --output text > ../bastion-key.pem
$ chmod 400 ../bastion-key.pem
$ ssh -i ../bastion-key.pem ec2-user@35.159.17.93
```

### ssh tunnel to aurora
```bash
ssh -i ../bastion-key.pem -L 5433:boilerplate6stack-boilerplate6auroradbc41949f5-vnajrernpof1.cluster-cniqg8kg8g2s.eu-central-1.rds.amazonaws.com:54
32 ec2-user@35.159.17.93 -N
```