import conf from '../config/config';

import { Database } from 'arangojs';

// @ts-ignore
export const db = new Database({
	url: conf.db.url,
	databaseName: conf.db.name,
	auth: { username: conf.db.username, password: conf.db.password },
});

export async function dbEnsureCollections(): Promise<void> {
	const expectedCollections = ['Trucks', 'LiveRecs', 'Users_', 'Logs_', 'Unhandled_', 'Conflicts', 'Errors_'];
	const collections = await db.listCollections();
	const existingCollections = collections.map((collection) => collection.name);
	const missingCollections = expectedCollections.filter((name) => !existingCollections.includes(name));
	if (missingCollections.length) {
		console.log('missingCollections', missingCollections);
		await Promise.all(missingCollections.map((name) => db.collection(name).create()));
	}
}

export async function dbEnsureIndexes(): Promise<void> {

	await db.collection('Trucks').ensureIndex({
		type: 'persistent',
		fields: ['number'],
		name: 'idx-Trucks-number',
		unique: true,
	});

	await db.collection('LiveRecs').ensureIndex({
		type: 'persistent',
		fields: ['front', 'truck', 'back'],
		name: 'idx-LiveRecs-front-truck-back',
		unique: true,
	});

	await db.collection('LiveRecs').ensureIndex({
		type: 'persistent',
		fields: ['mapp', 'front', 'status'],
		name: 'idx-LiveRecs-mapp-front-status',
		unique: true,
	});

	await db.collection('LiveRecs').ensureIndex({
		type: 'persistent',
		fields: ['mapp', 'truck', 'status'],
		name: 'idx-LiveRecs-mapp-truck-status',
		unique: true,
	});

	await db.collection('LiveRecs').ensureIndex({
		type: 'persistent',
		fields: ['mapp', 'back', 'status'],
		name: 'idx-LiveRecs-mapp-back-status',
		unique: true,
	});

	await db.collection('Users_').ensureIndex({
		type: 'persistent',
		fields: ['id'],
		name: 'idx-Users_-id',
		unique: true,
	});
}

export type tgID = number;
