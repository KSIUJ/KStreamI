#!/bin/bash
MY_IP=$(hostname -I | awk '{print $1}')
KSTREAMI_HOST=$MY_IP docker compose -f compose.wss.yaml build --quiet
clear
echo "    "
echo "    "
echo "                      KSTREAMI"
echo "======================================================"
echo "    sender: https://$MY_IP:8080"
echo "    receiver: https://$MY_IP:8080/receiver"
echo "======================================================"
echo "    "
echo "    "
KSTREAMI_HOST=$MY_IP docker compose -f compose.wss.yaml up --attach backend