if [ ! -f /init_done ]; then
    echo "Waiting for Elasticsearch to be ready..."
    until curl -s -u elastic:${ELASTIC_PASSWORD} http://elasticsearch:9200 > /dev/null; do
        echo "Elasticsearch not ready yet... waiting 5 seconds"
        sleep 20
    done

    echo "Elasticsearch is ready!"
	sleep 20

    echo "Setting kibana_system password..."
    curl -s -u elastic:${ELASTIC_PASSWORD} -X POST "http://elasticsearch:9200/_security/user/kibana_system/_password" \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"${KIBANA_PASSWORD}\"}"

    echo "Setting logstash_system password..."
    curl -s -u elastic:${ELASTIC_PASSWORD} -X POST "http://elasticsearch:9200/_security/user/logstash_system/_password" \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"${LOGSTASH_PASSWORD}\"}"

    echo "Creating role logstash_writer..."
    curl -s -u elastic:${ELASTIC_PASSWORD} -X PUT "http://elasticsearch:9200/_security/role/logstash_writer" \
        -H "Content-Type: application/json" \
        -d "{\"cluster\":[\"manage_index_templates\",\"monitor\"],\"indices\":[{\"names\":[\"*\"],\"privileges\":[\"auto_configure\",\"create_index\",\"create_doc\",\"index\",\"delete\",\"manage\"]}]}"

    echo "Creating user logstash_writer..."
        curl -s -u elastic:${ELASTIC_PASSWORD} -X POST "http://elasticsearch:9200/_security/user/logstash_writer" \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"${LOGSTASH_WRITER_PASSWORD}\",\"roles\":[\"logstash_writer\"],\"full_name\":\"Logstash Writer for data ingestion\",\"email\":null}"

    echo "Setup completed successfully!"
    touch /init_done
fi