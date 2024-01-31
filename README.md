## start app in docker (full dev build with worker) - ready to attach frontend
```bash
$ docker compose -f docker-compose.dev.yml build
$ docker compose -f docker-compose.dev.yml up
```
note: app is copied to the container, so rebuild  and restart on changes


## start app in docker (without worker) - for backend development purposes
```bash
$ docker compose build
$ docker compose up
```
note: app is mapped to the container, so it rebuilds on changes automatically

## deploy updates to dev server
ssh to dev server, then
```bash
$ cd /var/www/udk2_dev/udk2-api/
$ git pull origin master
$ docker compose -f docker-compose.dev.yml build
$ docker compose -f docker-compose.dev.yml restart
```

## MIGRATIONS

## Run migrations on dev
ssh to dev server, then
```bash
docker compose exec api_udk2 npm run migration:run
```

## Work with migrations
Commands must use exactly `npm run` because yarn doesn't support parameters

create new empty migration with name 'asdf'.
```bash
$ npm run migration:create --name=asdf
```

generate new migration  with name 'asdf' from schema changes.

```bash
$ npm run migration:g --name=asdf
```

Run all new migrations:
```bash
$ npm run migration:run
```

Revert last migration:
```bash
$ npm run migration:revert
```
