declare module "baseball-builder";

export interface ImageResult {
    expires: string;
    imageType: string;
    imageData: jpeg.BufferRet | null;
}
export declare class BaseballImage {
    constructor(logger: LoggerInterface, cache: KacheInterface);
    getImage(teamAbbrev: string): Promise<ImageResult | null>;
}