import { aql } from 'arangojs';
import { db, tgID } from '.';
import { MyContext } from '../context';
import { User as TUser } from '@grammyjs/types';

interface IUserData extends TUser {
	started_at: number;
}

export class User_ {
	static collection = db.collection('Users_');

	static async start(ctx: MyContext, from: TUser): Promise<any> {
		const user = await User_.findById(from.id);
		if (user) {
			return user;
		}
		const userData: IUserData = {
			...from,
			started_at: ctx.msg?.date as number,
		};
		const userMeta = await User_.collection.save(userData, { returnNew: true }); // , { overwriteMode: 'update' });

		return userMeta.new;
	}

	static async findById(id: tgID): Promise<any> {
		const user = await db
			.query(
				aql`
		FOR u IN Users_
		FILTER u.id == ${id}
		RETURN u`
			)
			.then((cursor) => cursor.next());
		return user;
	}

	static async updateById(id: tgID, patch: object): Promise<any> {
		const user = await db
			.query(
				aql`
		FOR u IN Users_
		FILTER u.id == ${id}
		UPDATE u WITH ${patch} IN Users_`
			)
			.then((cursor) => cursor.next());
		return user;
	}

	static async update(user: any, data: any): Promise<any> {
		await User_.collection.update(user, data);
	}
}
