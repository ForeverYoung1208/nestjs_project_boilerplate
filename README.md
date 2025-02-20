

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