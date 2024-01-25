##
As exapmle, used 4 datasources:
- main
- test
- tenant1
- tenant2

if you want to add some, add relevant file `src/database/datasources/XXXXXXX.datasource.ts`
and add its named export to `src/database/datasources/index.ts` file (follow the pattern)

then use exported name in  `src/database/database.service.ts` to write logic to switch between datasources depending on request params (host, query, etc...)


## MIGRATIONS
All commands commands must use exactly `npm run` because yarn doesn't support parameters.
all commands use datasource  `tenant1.datasource.ts` as example. Use as template for other datasouces.


run a migration on certain database:
```bash
npm run migration:run -- src/database/datasources/tenant1.datasource.ts 
```

create new empty migration with name 'asdf'.
```bash
$ npm run migration:create --name=asdf
```

generate new migration  with name 'asdf' from schema changes (database to compare will be taken using specified datasource).

```bash
$ npm run migration:g --name=asdf -- src/database/datasources/tenant1.datasource.ts 
```

Run all new migrations:
```bash
$ yarn migration:run -- src/database/datasources/tenant1.datasource.ts
```

Revert last migration:
```bash
$ yarn migration:revert -- src/database/datasources/tenant1.datasource.ts 
```