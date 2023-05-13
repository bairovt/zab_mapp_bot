export * from './dynamic';

export enum txt {
	no_records = 'Активных записей нет',

	// select_mapp = 'Выберите МАПП из списка',

	set_truck = 'Укажите корректный гос. номер тягача в формате: <b>А555ВЕ123</b>',

	record_not_found = 'Запись не найдена',

	// limit = 'Лимит на 5 актиных записей достигнут',

	info = `Информация`,

	incorrectMessage = `Некоректные данные`,

	start_info = `Это сервисный бот группы @zab_mapp`,

	// info = `ПРАВИЛА ЗАПИСИ:
	// 1. Запись производится через данного бота @ZabMappBot по номеру тягача - команда "Записаться" (/enter). Запись только в конец очереди.
	// 2. Снова записать тягач можно только после заезда на МАПП или выхода из очереди. Дублирование невозможно.
	// 3. Ваши активные записи находятся в разделе "Мои записи" (/myrecs).
	// 3. Выйти (удалить тягач) из очереди можно в любое время - кнопка "Выйти" в разделе "Мои записи".
	// 4. Сразу после заезда на МАПП аккаунт должен отметить завершение очереди тягача - кнопка ЗАЕХАЛ!.

	// 5. Выйти из очереди и завершить очередь можно только с аккаунта, записавшего тягач.
	// 6. Если тягач не появился к моменту заезда или не отметил заезд на МАПП, удаление из очереди производится администратором.
	// 7. Для просмотра текущей позиции тягача в очереди - кнопка "Обновить" в разделе "Мои записи".
	// 8. Один аккаунт может записать до 5 тягачей.
	// 9. Замены невозможны.
	// 10. Запрещено регистрировать фейковые номера тягачей.
	// 11. Запрещено регистрировать тягачи, не имеющие к Вам отношенния (постоянный бан аккаунта).
	// 12. За несоблюдение правил - бан аккаунта на месяц, при повторе - навсегда.
	// 13. Очередь отслеживается на канале @zabmapp и на сайте (скоро).
	// 14. Все команды/разделы доступны в Меню бота.
	// 15. После запуска федеральной системы очередности на МАПП данная очередь прекратит свое действие.
	// 16. Используя бота @zab_mapp_bot Вы соглашаетсь с этими правилами.
	// 17. "Перезапуск бота" (/start).
	// 18. Вызов этой информации команда "Справка" (/info).`,

	no_change = 'Без изменений',

}