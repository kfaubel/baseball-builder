import * as fs from "fs";

export interface ImageWriterInterface {
    saveFile(fileName: string, buf: Buffer): void;
}
export class SimpleImageWriter implements ImageWriterInterface {

    saveFile(fileName: string, buf: Buffer): void {
        fs.writeFileSync(fileName, buf);
    }
}