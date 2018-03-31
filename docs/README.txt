Админские команды:
Создать нового пользователя http://my.grasp.how/createNewUser/<login>/<password>/<admin secret>
Удалить пользователя и все его графы http://my.grasp.how/removeUser/<login>/<admin secret>
Обновить пароль пользователя http://my.grasp.how/updateUserPassword/<login>/<password>/<admin_secret>
Удалить граф http://grasp.local/removeGraph/<graph id>/<admin_secret>

Из-под пользователя:
Создание нового графа http://grasp.local/createNewGraph?data={"name":"newName"}
##Удалить граф http://grasp.local/removeGraph?data={"graph_id":"1234567"}
##Скопировать граф вместе с историей http://grasp.local/copyGraph?data={"name":"newName","graph_id":"123456"}
Склонировать граф http://grasp.local/cloneGraph?data={"graph_id":"222","history_step":"333"}

Запуск тестов:
http://grasp.local/lib/client/jasmine/jasmin.php
Регресионные тесты:
Запуск - http://grasp.local/apps/user_pkb/client/test/regression/run-all-tests.php
Чистка тестовой базы перед следующим запуском - http://grasp.local/rollbackTestChanges?TEST_NAME=testBackend
Удаление тестовой базы - http://grasp.local/clearTest?TEST_NAME=testBackend
Все запросы в тесте идут через прокси TestableApp который имеет дополнительные API вызовы:
createTestUser, loginTestUser, clearTest.
Запрос createTestUser создает пользователя с отдельной базой.
Под этим пользователем можно залогиниться с помощью loginTestUser.
В этой базе будут проходить все тесты.
Запрос clearTest удаляет текущего пользователя и базу.

Rollup/down migrations:
php scripts/migrations.php
Roll single migration:
php scripts\migrations.php -m=D20170917ChangeContentHistoryGraphIdIndex -d=up
php scripts\migrations.php -m=D20170917ChangeContentHistoryGraphIdIndex -d=up -u=5
Debug migrations:
php -dxdebug.remote_autostart=On  -dxdebug.remote_enable=1 -dxdebug.remote_mode=req -dxdebug.remote_port=9000 -dxdebug.remote_host=grasp.local  scripts/
migrations.php -m=D20170601AddDataColumnToSubscribeTable -d=up

If you want to test migration that is not commited yet, then roll only this migration.
If you run just "php scripts/migrations.php" then uncommited migration will run first.

Изменение типа узлов
1. Редактируем список типов в таблице graph
2. Редактируем соответствие типов и цветов в таблице graph_settings
3. Редактируем дефолтный граф (типы и соответствие цветов) в функции createNewGraph (appUserPkb.php)

##################### Условия на байесовский граф ##############################

1. Если факт, то есть поле soft evidence
(заполняется на основе источников данных, алгоритм вычисления reliability его не может менять).
Это же называется reliability. У факта может быть только две альтерантивы - факт верен и не верен.
Соответственно soft evidence задается в виде {"true":0.99, "false":"0.01"}
2. Если proposition, то есть поле априорная вероятность (человек его не может менять).
Изначально это поле равно 1/<кол-во альтернатив>. Потом вычисляется исходя из
soft evidence родителей и условных вероятностей P(proposition|родители)
3. У каждого следствия CHILD (=ребенка="узла с кружочком"), не важно факт это или proposition, есть условные вероятности
P(CHILD|родители) для каждой комбинации значений родителя. Заполняется человеком.
4. Любое proposition должно быть связано хотя бы с одним фактом или другим proposition. В графе должен быть хотя бы один факт.
5. Факты-причины (=факты-родители) должны быть независимы
6. Все следствия child1,child2,child3 причин parent1, parent2, ... должны быть независимы при parent1, parent2, ...
то есть P(child1,child2,child3|parent1, parent2, ... )=P(child1|parent1, parent2, ...)P(s2|parent1, parent2, ...)P(s3|parent1, parent2, ...)
7. Граф не должен содержать направленных циклов.


Простейший приближенный алгоритм вычисления вероятностей который можно реализовать в javascript работает следующим образом
1. Берутся все факты, для каждого генерируется его значение в соответствии с soft evidence.
2. Берутся вершины которые не являются ничьим ребенком (ни одно ребро не входит, все только выходят).
Если это факт для которого уже есть значение с шага 1. Если нет, то
генерируется значение альтернативы в соответствии с априорной вероятностью этой альтернативы.
 1 Цикл по всем детям - берется ребенок, всего его родители, для каждого родителя генерируется значение альтернативы
в соответствии с априорной вероятностью этой альтернативы (если еще не сгенерилось). Для факта эта вероятность берется из soft evidence.
 2 генерируется значение ребенка в соответствии с распределением P(child|parent1,parent2,...).
Если ребенок это факт, то он имеет сгенеренное значение на шаге 1. Если только что сгенеренное значение совпадает с этим,
то заносим в таблицу. Если нет, останавливаем цикл и переходим на шаг 1.
Если ребенок это proposition, то делаем для него шаг 2.1
3. Если мы находимся на этом шаге, значит мы сгенерили для узлов значения альтернатив, соответствующие soft evidence фактов.
Заносим этот вектор в таблицу consistentAlternativeValues. Если мы сделали шаг 3 уже 10000 раз
или consistentAlternativeValues содержит 1000 значений Идем на шаг 4.
4.Вероятность каждой альтернативы считается как
"кол-во её вхождений в consistentAlternativeValues"/"кол-во строк в consistentAlternativeValues"

Всего получается O(10000*(кол-во вершин в графе)) операций

------------------------------------------------------------

##################### Как ведется список источников. #####################
Case 1.
Человек вводит новый источник, он заносится в source, ссылка на него заносится в node_content_source.
Далее, в другом узле он вводит тот же источник но с немного другим названием. Создается дубликат в source.
Через некоторое время он понимает что это два одинаковых источника,
он редактирует прямо из списка источников узла не подтягивая ни один из имеющихся.
Появляется еще один дубликат - теперь их три.

Из-за этого нам нужен список всех источников с возможностью "удалить с заменой" - в этом случае он удаляется
из sources и все ссылки на него из node_content_source заменяются на эту "замену".

##################### Как делается снапшот содержания графа #####################
1. Каждую ночь делается снэпшот всех узлов которые изменились за предыдущий день. В качестве snap_timestamp проставляется
время начал создания снэпшота.
2. Если граф был расшарен, то при первом обращении к расшаренному сниппету (то есть при первом переходе по адресу
виде embed/[%7B"graphId":"24.198","step":12,"ts":1505926793469%7D]) делается снэпшот всех узлов этого графа в node_content_history.
Причем в качестве snap_timestamp проставляется значение ts из запроса (в примере это 1505926793469).
При таком подходе в большинстве случаев реальное время снэпшота (created_at) будет чуть больше чем snap_timestamp
Но в редких случаях оно может быть намного больше, поэтому snap_timestamp - это не тоже самое что реальное время снэпшота.
Таймстэмп который участвует в запросе на клонирование (третий параметр в cloneGraph/24.198/12/1505926793469)
это именно snap_timestamp. То есть из node_content_history выбирается вариант c snap_timestamp<=1505926793469 и максимальным id.
Так что тот кто клонирует должен увидеть в клоне текст узлов который он видит в сниппете, а не тот который соответствует времени = ts сниппета.

----------------------------------------------------------------------
----------------------------------------------------------------------
Если exec ругается на права
Try the following things:

try to run test command, if it works:
- php -r "echo exec('whoami');"
- all parent directories and the file have r-x:
chmod 755 dir; chmod 755 file,
- make sure that owner of the file is your nginx user (output of whoami command)
- try also to add +s flag to the file:
chmod u+s file,
- your PHP is not running in safe_mode
make sure that the script is inside your web root,
if not - move the script inside it,
or add that directory to your Apache configuration,
or add this directory to your include_path:
php.ini: include_path ".:/usr/local/lib/php:/your/dir"
or .htaccess: php_value include_path ".:/usr/local/lib/php:/your/dir"
- check as well if giving proper shell (/bin/sh) to your apache user make any difference (check with: finger),
make sure that your php.ini doesn't use: disable_functions for exec function
- if using SELinux or having selinux-utils installed (a Security-enhanced Linux system), check getenforce/setenforce configuration as described in @Tonin answer