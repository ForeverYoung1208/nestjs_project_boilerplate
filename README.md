## MIGRATIONS
create new empty migration with name 'asdf'.
This command must use exactly `npm run` because yarn doesn't support parameters:
```bash
$ npm run migration:create --name=asdf
```

generate new migration  with name 'asdf' from schema changes.
This command must use exactly `npm run` because yarn doesn't support parameters:
```bash
$ npm run migration:g --name=asdf
```

Run all new migrations:
```bash
$ yarn migration:run
```

Revert last migration:
```bash
$ yarn migration:revert
```