#!/bin/bash

# get an API key at  https://www.tumblr.com/docs/en/api/v2#auth

if [ -z "$1" ] || [ -z "$2" ] ; then
	echo "USAGE: ./download.sh TUMBLRURL APIKEY"
	exit 1
fi

URL="$1"
APIKEY="$2"

# we could get this programmatically, but it's not worth it here
POSTCOUNT="$(curl -s "https://api.tumblr.com/v2/blog/$URL/info?api_key=$APIKEY" | grep -Po '"total_posts":\d+' | grep -Po '\d+' | tr -d '\n')"

if [ -z "$POSTCOUNT" ] ; then
	echo "error! could not get postcount"
	exit 1
else
	echo "#$POSTCOUNT posts..."
fi

echo "mkdir \"./$URL\""

for offset in $(seq 0 20 $POSTCOUNT); do
	echo "echo \"$offset/$POSTCOUNT\""
	echo "curl \"https://api.tumblr.com/v2/blog/$URL/posts?api_key=$APIKEY&limit=20&offset=$offset\" > $(printf ./%s/%08d.json $URL $offset)"
done

echo "#pipe me into a shell!"
