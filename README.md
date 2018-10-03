# grasp.how
grasp.how - online visual tool for analysis of importance and reliability of information

# prepare
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
4. copy contents of nginx-config to /etc/nginx/sites-enabled/default
5. load databases docs/init_db/yovalue.sql, docs/init_db/yovalue_user_template.sql
