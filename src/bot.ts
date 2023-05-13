import { Bot, GrammyError, HttpError, BotError, session } from 'grammy';
import conf from './config/config';
import { User_, Log_, db, dbEnsureIndexes, dbEnsureCollections} from './models'; // Mapps, TMapp
import { User as TUser, Contact } from '@grammyjs/types';
// import {
// 	recordInfo,
// 	checkRecordInfo,
// } from './helpers';
import { MyContext, initialSessionData } from './context';
import { Router } from '@grammyjs/router';
import { isNotModifiedError } from './utils';
import {txt, truckExistsTxt} from './txt';
import { getMappsKb, getRecordKb, confirmKB, confirmKBTxt } from './keyboards';
import { InlineKeyboard } from 'grammy';
// import {isArangoError} from 'arangojs';
import { ArangoError } from "arangojs/error";
import { ILiveRec, LiveRec } from './models/LiveRec';
// import { truckExistsTxt } from './txt/dynamic';


if (!conf.nodeEnv) throw new Error('NODE_ENV is not set');

const bot = new Bot<MyContext>(conf.bot.token as string);

bot.use(async (ctx, next) => {
	// topic only
	const thread_id = ctx.msg?.message_thread_id?.toString();
	if (thread_id !== conf.message_thread_id) {
		return;
	}

	await Log_.create({ update: ctx.update });
	if (!ctx.msg?.text) throw new Error('No text in message');
	await next();
});

async function checkTruckNumber(ctx: MyContext, next: () => Promise<void>) {
	const truckNumber = ctx.message?.text?.toLocaleUpperCase();
}

async function resp400(message: string, ctx: MyContext, delMsg: boolean) {
	// reply to message
	await ctx.api.sendMessage(ctx.chat?.id as number, message, {
		reply_to_message_id: ctx.msg?.message_id,
		parse_mode: 'HTML',
	});
	// if (delMsg) {
	// 	// delete message after 5 seconds if it's not valid truck numbers
	// 	setTimeout(async () => {
	// 		// const msg = await ctx.api.getMessage(ctx.chat?.id as number, ctx.msg?.message_id as number);
	// 		await ctx.api.deleteMessage(ctx.chat?.id as number, ctx.msg?.message_id as number);
	// 	}, 5000);
	// }
}

function isValidTruckNumber(number: string) {
	return /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(number);
}

bot.on(':is_topic_message', async (ctx, next) => {
	// ignore service and anonymous admin messages
	if (ctx.msg.from?.is_bot && ctx.msg.from?.username === 'GroupAnonymousBot') return;

	let truckNumbersTxt = ctx.message?.text?.toLocaleUpperCase();

	if (!truckNumbersTxt) {
		return await resp400(txt.incorrectMessage, ctx, true);
	} else {
		truckNumbersTxt = truckNumbersTxt.replace(/\s/g, '');
		const truckNumsArr = truckNumbersTxt.split(',');
		if (truckNumsArr.length !== 3) {
			return await resp400(txt.incorrectMessage, ctx, true);
		}
		for (let i=0; i<3; i++) {
			// todo: last truck number?
			if (!isValidTruckNumber(truckNumsArr[i])) {
				let invalidNumberMsg = `${truckNumsArr[i]} - некорректный номер.`;
				return await resp400(invalidNumberMsg, ctx, true);
			}
		}
		const timestamp =  Date.now();
		const recordDto: ILiveRec = {
			mapp: 'Zab',
			front: truckNumsArr[0],
			truck: truckNumsArr[1],
			back: truckNumsArr[2],
			from: ctx.msg.from as TUser,
			timestamp,
			created_at: new Date(timestamp),
			status: 'ON'
		};
		let liveRec: ILiveRec;
		try {
			liveRec = await LiveRec.create(recordDto);
			// reply to message
			await ctx.api.sendMessage(ctx.chat?.id as number, `Успешно сохранено (${liveRec._key})`, {
				reply_to_message_id: ctx.msg?.message_id,
				parse_mode: 'HTML',
			});
		} catch (err: any) {
			console.error(err);
			// на случай одновременной записи / index conflict
			if (err?.message === 'front_conflict' || err?.message === 'truck_conflict' || err?.message === 'back_conflict') {
				let conflictMsg;
				switch (err.message) {
					case 'front_conflict':
						conflictMsg = ` ${recordDto.front} уже записан перед другим тягачом!`;
						break;
					case 'truck_conflict':
						conflictMsg = ` ${recordDto.truck} уже записан в очередь!`;
						break;
					case 'back_conflict':
						conflictMsg = ` ${recordDto.back} уже записан за другим тягачом!`;
						break;
					default:
						conflictMsg = err.message;
				}

				recordDto.conflict = err.message;
				const newConflict = await db.collection('Conflicts').save({ recordDto }, {returnNew: true});
				return await resp400(`${conflictMsg} (${newConflict._key})`, ctx, false);
			}
			if (err instanceof ArangoError && err.code === 409) return await resp400(`Такая комбинация уже существует`, ctx, false);
			throw err;
		}
	}
});

bot.command('start', async (ctx) => {
	await User_.start(ctx, ctx.msg?.from as TUser);
	await ctx.reply(txt.start_info, {
		reply_markup: { remove_keyboard: true },
	});
});

// unhandled updates
bot.use(async (ctx, next) => {
	if (conf.nodeEnv === 'development') {
		console.log('!!! UNHANDLED UPDATE');
	}

	// todo: respond something
	await db.collection('Unhandled_').save({ update: ctx.update });
	ctx.session.step = 'idle';
	return await ctx.reply(txt.info, {
		reply_markup: { remove_keyboard: true },
	});
});

bot.catch(async (err) => {
	try {
		await db.collection('Errors_').save(err);

		const ctx = err.ctx;
		console.error(`Error while handling update ${ctx.update.update_id}:`);
		const e = err.error;
		if (e instanceof BotError) {
			console.error('Bot Error:', e.error);
		} else if (e instanceof GrammyError) {
			// if (isNotModifiedError(e)) return; // ignore this error
			console.error('Error in request:', e.description);
		} else if (e instanceof HttpError) {
			console.error('Could not contact Telegram:', e);
		} else {
			console.error('UNKNOWN_ERROR::', e);
		}
	} catch (error) {
		console.error('Error while err handle:', error);
	}
});

async function main() {
	await dbEnsureCollections();

	await dbEnsureIndexes();

	// await bot.api.setMyCommands([
	// 	{ command: 'enter', description: 'Записаться в очередь' },
	// 	{ command: 'myrecs', description: 'Мои записи' },
	// 	// { command: 'dostavka', description: 'О доставк	е' },
	// 	{ command: 'start', description: 'Перезапуск бота' },
	// 	{ command: 'info', description: 'Справка' },
	// ]);

	// This will connect to the Telegram servers and wait for messages.
	bot.start({
		onStart: (botInfo) => console.log(`${botInfo.username} ran at ${new Date()}`),
		allowed_updates: ['message', 'callback_query'],	//'channel_post'
	});
}

main();
