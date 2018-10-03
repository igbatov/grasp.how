# grasp.how
grasp.how - online visual tool for analysis of importance and reliability of information

# prepare
install nginx, mysql, php-fpm, phpunit, php-curl

install webppl https://github.com/probmods/webppl

install rscript
- sudo apt install r-base-core
- sudo apt install r-cran-littler

# installation
1. clone code
2. add Config.json

Write   

- "RscriptPath":"/usr/bin/Rscript"
- "WebPPLPath":"/usr/local/bin/webppl",

to Config.json

3. Add directories 
- backups/
- embed_cache
- tmp
- uploads
- logs

4. copy contents of nginx-config to /etc/nginx/sites-enabled/default
5. load databases docs/init_db/yovalue.sql, docs/init_db/yovalue_user_template.sql

# cron
```
30 0    * * *   root    /var/www/html/grasp.how/scripts/cron.php daily >> /var/www/html/grasp.how/logs/cron.log  2>&1
30 1    * * *   root    /var/www/html/grasp.how/scripts/backup.php >> /var/www/html/grasp.how/logs/backup.log  2>&1
01 5 *  *  *   root    /var/www/html/grasp.how/scripts/graphImageGenerator/generator.php >  /var/www/html/grasp.how/scripts/graphImageGenerator/generator.log 2>&1

*/5 * *  *  *   root    /bin/date >> /var/log/pidstat/pidstatCPU.log
*/5 * *  *  *   root    /usr/bin/pidstat -l 300 1  | awk '$1 ~ !/Average/ { print }'  >> /var/log/pidstat/pidstatCPU.log  2>&1
*/5 * *  *  *   root    /bin/date >> /var/log/pidstat/pidstatMEM.log
*/5 * *  *  *   root    /usr/bin/pidstat -l -r 300 1  | awk '$1 ~ !/Average/ { print }'  >> /var/log/pidstat/pidstatMEM.log  2>&1
*/5 * *  *  *   root    /bin/date >> /var/log/pidstat/pidstatDISK.log
*/5 * *  *  *   root    /usr/bin/pidstat -l -d 300 1  | awk '$1 ~ !/Average/ { print }'  >> /var/log/pidstat/pidstatDISK.log  2>&1
```
# cron scripts
add `~/.credentials/drive-php-uploader.json` and `/var/www/html/grasp.how/scripts/google/client_secret.json` for `scripts/backup` to work properly
