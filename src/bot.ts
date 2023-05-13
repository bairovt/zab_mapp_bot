import { Bot, GrammyError, HttpError, BotError, session } from 'grammy';
import conf from './config/config';
import { User_, Log, Record, Mapps, db, dbEnsureIndexes, dbEnsureCollections, TMapp } from './models';
import { User as TUser, Contact } from '@grammyjs/types';
import {
	recordInfo,
	checkRecordInfo,
} from './helpers';
import { MyContext, initialSessionData } from './context';
import { Router } from '@grammyjs/router';
import { isNotModifiedError } from './utils';
import {txt, truckExistsTxt} from './txt';
import { getMappsKb, getRecordKb, confirmKB, confirmKBTxt } from './keyboards';
import { InlineKeyboard } from 'grammy';
// import {isArangoError} from 'arangojs';
import { ArangoError } from "arangojs/error";
import { IRecord, ITruck } from './models/Record';
// import { truckExistsTxt } from './txt/dynamic';


if (!conf.nodeEnv) throw new Error('NODE_ENV is not set');

const bot = new Bot<MyContext>(conf.bot.token as string);

bot.use(async (ctx, next) => {
	await Log.create({ update: ctx.update });
	await next();
});

bot.on(':is_topic_message', async (ctx, next) => {
	// ignore service and anonymous admin messages
	if (ctx.msg.from?.is_bot && ctx.msg.from?.username === 'GroupAnonymousBot') return;

	// reply to message
	await ctx.api.sendMessage(ctx.chat?.id as number, txt.info + ': ' + ctx.msg.text, {
		reply_to_message_id: ctx.msg?.message_id,
	});

	// delete message after 5 seconds if it's not valid truck numbers
	setTimeout(async () => {
		// const msg = await ctx.api.getMessage(ctx.chat?.id as number, ctx.msg?.message_id as number);
		await ctx.api.deleteMessage(ctx.chat?.id as number, ctx.msg?.message_id as number);
	}, 5000);

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
		await db.collection('ErrorsLog').save(err);

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

	// await dbEnsureIndexes();

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
