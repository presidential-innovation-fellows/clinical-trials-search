#!/bin/sh
set -e

# update apt-get
sudo apt-get update

# install build-essential
sudo apt-get install build-essential

# install java
sudo apt-get install openjdk-7-jre

# install nodejs v6
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs

# install postgres
sudo apt-get install postgresql python-psycopg2 libpq-dev

# install csvsql
sudo apt-get install python-pip
sudo pip install csvkit

# install elasticsearch
wget -qO - https://packages.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://packages.elastic.co/elasticsearch/2.x/debian stable main" | sudo tee -a /etc/apt/sources.list.d/elasticsearch-2.x.list
sudo apt-get update && sudo apt-get install elasticsearch

# install sshpass and unzip
sudo apt-get install sshpass zip

cd ../import/export_from_pg && npm install
cd ../cleanse && npm install
cd ../../search/api && npm install
cd ../index && npm install
