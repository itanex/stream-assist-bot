import fs from 'fs';
import { inject, injectable } from 'inversify';
import winston from 'winston';
// import { DeathCountRecord } from './types/DeathCountRecord';
import { TYPES } from '../dependency-management/types';

interface IRead<T> {
    read(): T[];
    readOne(id: number): T;
}

interface IWrite<T> {
    create(item: T): T;
    update(id: number, item: T): T;
    delete(id: number): boolean;
}

interface IRepository<T> extends IRead<T>, IWrite<T> { }

// abstract class Repository<T> implements IRepository<T> {
//     protected data = {};

//     constructor() {
//     }

//     create(item: T): T {
//         this.data.push(item);

//         return item;
//     }

//     read(): T[] {
//         return this.data;
//     }

//     readOne(id: number): T {
//         return this.data.find(x => x.id === id);
//     }

//     update(id: number, item: T): T {
//         let record = this.readOne(id);

//         record = item;

//         return record;
//     }

//     delete(id: number): boolean {
//         const index = this.data.findIndex(x => x.id === id);

//         const record = this.data.splice(index, 1);

//         return !!record;
//     }
// }

// @injectable()
// abstract class FileRepository<T> extends Repository<T> implements IRepository<T> {
//     protected dataRoot = 'data';
//     protected dataFile = `${this.dataRoot}/datastore.json`;

//     /**
//      *
//      */
//     constructor(
//         private logger: winston.Logger,
//     ) {
//         super();
//         this.generateFile();
//     }

//     override create(item: T): T {
//         const record = super.create(item);

//         this.writeFile();

//         return record;
//     }

//     override read(): T[] {
//         if (this.data) {
//             super.read();
//         }

//         return this.data;
//     }

//     override readOne(id: number): T {
//         if (this.data) {
//             super.read();
//         }

//         const record = super.readOne(id);

//         return record;
//     }

//     override update(id: number, item: T): T {
//         const record = super.update(id, item);
//         this.writeFile();

//         return record;
//     }

//     override delete(id: number): boolean {
//         const result = super.delete(id);
//         this.writeFile();

//         return result;
//     }

//     private readFile(): void {
//         const raw = fs.readFileSync(this.dataFile, { encoding: 'utf-8' });

//         this.data = JSON.parse(raw);
//     }

//     private writeFile(): boolean {
//         try {
//             fs.writeFileSync(this.dataFile, JSON.stringify(this.data), { encoding: 'utf-8' });
//             return true;
//         } catch (e) {
//             this.logger.error('Repository - Unable to write to datastore');
//             return false;
//         }
//     }

//     private generateFile(): void {
//         if (!fs.existsSync(this.dataFile)) {
//             if (!fs.existsSync(this.dataRoot)) {
//                 fs.mkdirSync(this.dataRoot, { recursive: true });
//             }

//             this.writeFile();
//         }
//     }
// }

// @injectable()
// class DeathRepository extends FileRepository<DeathCountRecord> implements IRepository<DeathCountRecord> {
//     constructor(
//         @inject(TYPES.Logger) logger: winston.Logger,
//     ) {
//         super(logger);
//     }

//     override create(item: DeathCountRecord): DeathCountRecord {
//         if (this.data)
//             return null;
//     }
// }

export { IRepository, /*DeathRepository*/ };
