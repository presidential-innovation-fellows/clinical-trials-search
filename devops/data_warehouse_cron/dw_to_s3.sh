psql -d ctrp-data-warehouse -f trial_query.sql -o /opt/api/data/trials.out
aws s3 cp /opt/api/data/trials.out s3://datawarehouse-development/
aws s3 cp /opt/api/data/trials.out s3://datawarehouse-staging/
aws s3 cp /opt/api/data/trials.out s3://datawarehouse-production/
