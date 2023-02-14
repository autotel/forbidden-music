#!/bin/bash
while true; do

inotifywait -e modify,create,delete -r ./src && \
npm run check

done