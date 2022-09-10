interface Data {
    [key: string]: any[];
}
interface IncDecObject {
    [key: string]: number;
}
interface Object {
    [key: string]: any;
    $inc?: IncDecObject;
    $dec?: IncDecObject;
    $pop?: {
        [key: string]: 0 | -1;
    };
    $push?: {
        [key: string]: any;
    };
}
interface UpdateManyOptions {
    updateAll: boolean;
}
interface DeleteManyOptions {
    deleteAll: boolean;
}
interface ConnectOptions {
    writeSync?: boolean;
}
export declare class JSONDB {
    readonly data: Data;
    readonly dataName: string;
    readonly dataArr: Object[];
    validate: any;
    connected: boolean;
    updateKeywords: string[];
    dbOptions: ConnectOptions;
    constructor(dataName: string);
    get allData(): Promise<Object[]>;
    connect(schema: Object, options: ConnectOptions): Promise<unknown>;
    create(data: Object): Promise<unknown>;
    findOne(filter: Object): Promise<Object | null>;
    findMany(filter: Object): Promise<Object[]>;
    findOneAndUpdate(filter: Object, newData: Object): Promise<unknown>;
    updateMany(filter: Object, newData: Object, options?: UpdateManyOptions): Promise<unknown>;
    findOneAndDelete(filter: Object): Promise<unknown>;
    deleteMany(filter: Object, options?: DeleteManyOptions): Promise<unknown>;
    private filter;
    private updateJSONFile;
    private update;
    private validateSchema;
    private updateNumberValues;
    updateArrayValues: (keysToUpdate: string[], specialUpdateKey: "$push" | "$pop", oldData: Object, newObj: Object, objectToUpdate: Object) => Object;
}
export {};
