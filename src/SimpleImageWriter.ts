import * as fs from "fs";

export interface ImageWriterInterface {
    saveImage(fileName: string, buf: Buffer): void;
}
export class SimpleImageWriter implements ImageWriterInterface {

    saveImage(fileName: string, buf: Buffer): void {
        fs.writeFileSync(fileName, buf);
    }
}