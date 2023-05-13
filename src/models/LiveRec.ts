import { aql } from 'arangojs';
import { db, tgID } from '.';
import { MyContext } from '../context';
import { User as TUser, Contact } from '@grammyjs/types';
import conf from '../config/config';
import { Mapps, TMapp } from './mapp';
import { ArangoError } from "arangojs/error";


// export type TStatus = 'ENTERED' | 'MOVED' | 'EXITED' | 'FINISHED' | 'DELETED';
export type TLiveRecStatus = 'ON' | 'DEL' | 'FAKE' | 'FINISH' | 'EXIT';


export interface ILiveRec {
	_id?: string;
	_key?: string;
	mapp: TMapp;
	front: string | null;
	truck: string;
	back: string | null;
	from: TUser;
	// inn: string;
	// tg_user_id: number;
	// tg_tel: string;
	// tg_contact: Contact;
	timestamp: number;
	created_at: Date;
	updated_at?: Date;
	status: TLiveRecStatus;
	exited_at?: Date;
	finished_at?: Date;
	deleted_at?: Date;
	deleted_by?: number; // tg user id
	deleted_reason?: string;
	// moved_at?: Date;
	// moved_reason?: string;
	// moved_by?: number; // tg user id
	conflict?: string;
}
export interface ILiveRec {
	mapp: TMapp;
	truck: string;
}


export class LiveRec {
	static collection = db.collection('LiveRecs');
	static async find(example: ILiveRec): Promise<ILiveRec> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.mapp == ${example.mapp}
		FILTER rec.truck == ${example.truck}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async findTruckInLive(example: ILiveRec): Promise<ILiveRec> {
		const truck = await db
			.query(
				aql`
		FOR rec IN LiveRecs
		FILTER rec.truck == ${example.truck}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}
	static async findFrontInLive(example: ILiveRec): Promise<ILiveRec> {
		const front = await db
			.query(
				aql`
		FOR rec IN LiveRecs
		FILTER rec.front == ${example.front}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return front;
	}
	static async findBackInLive(example: ILiveRec): Promise<ILiveRec> {
		const back = await db
			.query(
				aql`
		FOR rec IN LiveRecs
		FILTER rec.back == ${example.back}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return back;
	}

	static async create(liveRecData: ILiveRec): Promise<ILiveRec> {
		const existionFront = await LiveRec.findFrontInLive(liveRecData);
		if (existionFront) {
			throw new Error(`front_conflict`);
		}
		const existionTruck = await LiveRec.findTruckInLive(liveRecData);
		if (existionTruck) {
			throw new Error(`truck_conflict`);
		}
		const existionBack = await LiveRec.findBackInLive(liveRecData);
		if (existionBack) {
			throw new Error(`back_conflict`);
		}

		let recMeta = await LiveRec.collection.save(liveRecData, { returnNew: true });
		return recMeta.new;
	}

	static async exit(truck: ILiveRec): Promise<void> {
		const archiveCollection = db.collection('ArchiveTrucks');

		// todo: make in transaction https://arangodb.github.io/arangojs/8.2.1/classes/transaction.Transaction.html
		await LiveRec.collection.remove(truck._id as string, {waitForSync: true});

		// const behindTruck = await Truck.getBehindTruck(truck.truck);
		// await truckCollection.update(behindTruck._id as string, { infront: truck.infront, updated_at: truck.exited_at}, { waitForSync: true });

		truck.status = 'EXIT';
		truck.exited_at = new Date();
		await archiveCollection.save(truck, { waitForSync: true });
		return;
	}

	static async finish(truck: ILiveRec): Promise<void> {
		const archiveCollection = db.collection('ArchiveTrucks');
		truck.status = 'FINISH';
		truck.finished_at = new Date();
		// todo: transaction
		await archiveCollection.save(truck, { waitForSync: true });
		await LiveRec.collection.remove(truck._id as string, {waitForSync: true});
		return;
	}

	static async delete(truck: ILiveRec, reason: string, by: number): Promise<void> {
		const archiveCollection = db.collection('ArchiveTrucks');
		truck.status = 'DEL';
		truck.deleted_at = new Date();
		truck.deleted_reason = reason;
		truck.deleted_by = by;
		// todo: transaction
		await archiveCollection.save(truck, { waitForSync: true });
		await LiveRec.collection.remove(truck._id as string, {waitForSync: true});
		return;
	}

	static async findByKey(_key: string): Promise<ILiveRec> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec._key == ${_key}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async findByTruck(trcukNum: string): Promise<ILiveRec> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.truck == ${trcukNum}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async getLast(mapp: TMapp): Promise<ILiveRec> {
		const truckCollection = db.collection(mapp + 'Trucks');
		const truck = await db
			.query(
				aql`
				FOR rec IN ${truckCollection}
				SORT rec.timestamp DESC
				LIMIT 1
				RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async getPosition(truck: ILiveRec): Promise<number> {
		const position = await db
			.query(
				aql`
				LET truckDocument = DOCUMENT(${truck._id})

				LET position = (
					FOR doc IN Trucks
						FILTER doc.mapp == ${truck.mapp}
						FILTER doc.timestamp <= truckDocument.timestamp
						COLLECT WITH COUNT INTO count
						RETURN count
				)

				RETURN FIRST(position)`
			)
			.then((cursor) => cursor.next());

		return position;
	}

	static async findAllMyTrucks(tg_user_id: number): Promise<ILiveRec[]> {
		const trucks = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.tg_user_id == ${tg_user_id}
		SORT rec.timestamp ASC
		RETURN rec`
			)
			.then((cursor) => cursor.all());

		return trucks;
	}

	static async updateByKey(truckKey: string, patch: object): Promise<any> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec._key == ${truckKey}
		UPDATE rec WITH ${patch} IN Trucks`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async getBehindTruck(truckNumber: string): Promise<ILiveRec> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.infront == ${truckNumber}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}
}
