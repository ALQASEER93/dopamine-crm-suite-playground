declare module "mongodb" {
  export type MongoClientOptions = Record<string, unknown>;

  export class MongoClient {
    constructor(uri: string, options?: MongoClientOptions);
    connect(): Promise<MongoClient>;
  }
}
