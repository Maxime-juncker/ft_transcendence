if [ ! -f /init_done ]; then
    echo 'Waiting for Kibana to be fully ready...';
	until curl -s -u elastic:${ELASTIC_PASSWORD} http://kibana:5601/admin/kibana/api/status | grep -q '\"level\":\"available\"'; do
        echo 'Still waiting for Kibana...';
        sleep 5;
    done;
    echo 'Kibana is ready! Importing dashboard and Data View...';
    curl -X POST http://kibana:5601/admin/kibana/api/saved_objects/_import?overwrite=true -u elastic:${ELASTIC_PASSWORD} -H 'kbn-xsrf: true' --form file=@/export.ndjson;
    echo 'Import completed successfully!';
    touch /init_done;
fi