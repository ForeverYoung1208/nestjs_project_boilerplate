## MIGRATIONS
create new empty migration with name 'asdf'
```bash
$ npm run migration:create --name=asdf
```

generate new migration  with name 'asdf' from schema changes
```bash
$ npm run migration:g --name=asdf
```

run all new migrations 
```bash
$ npm run migration:run
```

revert last migration
```bash
$ npm run migration:run
```