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
    indentSpace?: number;
}
export declare class JSONDB {
    private readonly data;
    private readonly dataName;
    private readonly dataArr;
    private validate;
    private connected;
    private updateKeywords;
    private dbOptions;
    constructor(dataName: string);
    get allData(): Promise<Object[]>;
    connect(schema: Object, options: ConnectOptions): Promise<unknown>;
    create(data: Object): Promise<unknown>;
    findOne(filter: Object): Promise<Object | null>;
    findMany(filter: Object): Promise<Object[]>;
    findOneAndUpdate(filter: Object, newData: any): Promise<unknown>;
    updateMany(filter: Object, newData: Object, options?: UpdateManyOptions): Promise<unknown>;
    findOneAndDelete(filter: Object): Promise<unknown>;
    deleteMany(filter: Object, options?: DeleteManyOptions): Promise<unknown>;
    private filter;
    private updateJSONFile;
    private update;
    private validateSchema;
    private updateNumberValues;
    private updateArrayValues;
}
export {};
