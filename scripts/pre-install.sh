sudo apt-get install git
git config --global user.name "michaelbalint"
git config --global user.email "michael.balint@pif.gov"
cd /opt
git clone git@github.com:presidential-innovation-fellows/clinical-trials-search.git
sudo apt-get install nginx
sudo npm install pm2 -g
# don't forget to upload /import/import_into_pg/download_ctrp.sh and the files in /data
