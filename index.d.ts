declare module "baseball-builder";

export interface ImageResult {
    expires: string;
    imageType: string;
    imageData: jpeg.BufferRet | null;
}
export declare class BaseballImage {
    private baseballData;
    private dayList;
    private logger;
    private cache;
    constructor(logger: Logger, cache: Cache);
    getImage(teamAbbrev: string): Promise<ImageResult | null>;
}