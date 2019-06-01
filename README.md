# grasp.how
grasp.how - online visual tool for analysis of importance and reliability of information

# prepare
(Ubuntu 18.04.1 LTS example)

install nginx, mysql, php-fpm, phpunit, php-curl, php-mbstring, php7.2-mbstring

pear install MDB2-2.5.0b5

pear install MDB2_Driver_mysqli-1.5.0b4

update certificate
```
sudo add-apt-repository ppa:certbot/certbot
sudo apt install python-certbot-nginx
sudo certbot renew
```

install webppl https://github.com/probmods/webppl

install rscript:
- sudo apt install r-base-core
- sudo apt install r-cran-littler

install gRain in r:
```
sudo apt-get install gcc g++ libblas-dev liblapack-dev gfortran
sudo r
library("utils")
source("http://bioconductor.org/biocLite.R")
biocLite(c("graph", "RBGL", "Rgraphviz"))
install.packages("gRain", dependencies=TRUE)
```

To use image generation install nvm and node v4.4.3
- `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash`
- nvm install 4.4.3
- sudo apt-get install php-imagick
- sudo apt-get install libxml2  librsvg2-bin
- cp /root/.nvm/versions/node/v4.4.3/bin/node /usr/local/bin/nodejs

(Apache should have permission to execute every directory in path /usr/local/bin/nodejs)

Make sure /usr/bin/convert exists and properly converts file.svg to file.jpg with
"/usr/bin/convert file.svg file.jpg" command

# installation
1. clone code
2. add Config.json

Write   

- "RscriptPath":"/usr/bin/Rscript"
- "WebPPLPath":"/usr/local/bin/webppl",

to Config.json

3. Add directories 
- backups/
- web/embed
- tmp
- uploads
- logs
- web/img/graph_shots/
4. add permissions
chmod o+w tmp/ embed_cache/ uploads/ logs/ img/graph_shots/
5. copy contents of nginx-config to /etc/nginx/sites-enabled/default
6. load databases docs/init_db/yovalue.sql, docs/init_db/yovalue_user_template.sql

# cron
```
30 0    * * *   root    /var/www/html/grasp.how/scripts/cron.php daily >> /var/www/html/grasp.how/logs/cron.log  2>&1
30 1    * * *   root    /var/www/html/grasp.how/scripts/backup.php >> /var/www/html/grasp.how/logs/backup.log  2>&1
# optional
#01 5 *  *  *   root    /var/www/html/grasp.how/scripts/graphImageGenerator/generator.php >  /var/www/html/grasp.how/scripts/graphImageGenerator/generator.log 2>&1

*/5 * *  *  *   root    /bin/date >> /var/log/pidstat/pidstatCPU.log
*/5 * *  *  *   root    /usr/bin/pidstat -l 300 1  | awk '$1 ~ !/Average/ { print }'  >> /var/log/pidstat/pidstatCPU.log  2>&1
*/5 * *  *  *   root    /bin/date >> /var/log/pidstat/pidstatMEM.log
*/5 * *  *  *   root    /usr/bin/pidstat -l -r 300 1  | awk '$1 ~ !/Average/ { print }'  >> /var/log/pidstat/pidstatMEM.log  2>&1
*/5 * *  *  *   root    /bin/date >> /var/log/pidstat/pidstatDISK.log
*/5 * *  *  *   root    /usr/bin/pidstat -l -d 300 1  | awk '$1 ~ !/Average/ { print }'  >> /var/log/pidstat/pidstatDISK.log  2>&1
```
# cron scripts
add `~/.credentials/drive-php-uploader.json` and `/var/www/html/grasp.how/scripts/google/client_secret.json` for `scripts/backup` to work properly

# email send from php
sudo apt-get install ssmtp
sudo vim /etc/ssmtp/ssmtp.conf
Write this lines
```
mailhub=smtp.yandex.ru:587
UseSTARTTLS=YES
AuthUser=igbatov@grasp.how
AuthPass=xxxxxxxxxxx

FromLineOverride=YES
```

Check that email send works:
```
php scripts/mail_test.php
```

# Add git hook to save revision to rev.txt
```
vim /var/www/html/grasp.how/.git/hooks/post-merge
```

```
#!/bin/bash
  
FILENAME='rev.txt'
shorthash=`git log --pretty=format:'%h' -n 1`
echo $shorthash > $FILENAME
```

```
chmod +x /var/www/html/grasp.how/.git/hooks/post-merge
```