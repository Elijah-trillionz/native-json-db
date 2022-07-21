# native-json-db

## Queries:
1. .create(data) => creates a user, it takes only an object of data. This data must align with the schema for this class instance.
2. .schema(data) => creates a schema for the current instance. It takes only an object of data with the valid JavaScript data types as values
3. .updateOne(filter, newData) => updates an existing object. The filter is an object that both the key and value is used to find the first occurrence of that key and value. Should return null if no occurrence was found.
4. .updateMany(filter, newData) => updates an existing object. The filter is an object that both the key and value is used to find all occurrences of that key and value. Should return null if no occurrence was found.
5. .findOne(filter) => finds an object of data. Returns the first found occurrence. The filter in others apply here too. Return null if not found
6. .findMany(filter) => finds a set of similar objects. Returns all occurrences. Return null if not found
7. deleteOne(filter) => deletes the first found occurrence.
8. deleteMany(filter) => deletes all found occurrences.

## Contributing

- Clone current project, which includes a `tsconfig.json` that specifically compiles Typescript to JavaScript in the __dist__ directory.
- Write code only in typescript, specifically in the __src__ directory, code should not be written/edited in the __dist__ directory.
- The __src__ directory only contains typescript files of the package i.e files that matter
- the __examples__ directory would contain any typical example of using the database

A sample of a simple query
