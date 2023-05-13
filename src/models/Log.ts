import { db } from '.';
import { Update } from '@grammyjs/types';

interface ILog {
	update: Update;
	unhandled?: boolean;
	// error?: unknown;
}

export class Log_ {
	static readonly collection = db.collection('Logs_');

	static async create(log: ILog) {
		await Log_.collection.save(log); // , { returnNew: true, overwriteMode: 'update' });
	}
}
