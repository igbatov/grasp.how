Админские команды:
Создать нового пользователя http://my.grasp.how/createNewUser/<login>/<password>/<admin secret>
Обновить пароль пользователя http://my.grasp.how/updateUserPassword/<login>/<password>/<admin_secret>
Удалить граф http://grasp.local/removeGraph/<graph id>/<admin_secret>

Из-под пользователя:
Создание нового графа http://grasp.local/createNewGraph?data={"name":"newName"}
Удалить граф http://grasp.local/removeGraph?data={"graph_id":"1234567"}
Скопировать граф вместе с историей http://grasp.local/copyGraph?data={"name":"newName","graph_id":"123456"}
Склонировать граф http://grasp.local/cloneGraph?data={"graph_id":"222","history_step":"333"}

Запуск тестов:
http://grasp.local/lib/client/jasmine/jasmin.php