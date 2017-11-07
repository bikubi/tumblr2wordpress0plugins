# Import a tumblr into WordPress

Without a plugin!

Unfinished. I stopped caring about its shortcomings, because it did what I needed it to do: import two tumblrs into one WordPress, one with 500 photo posts, the other a mix of text/photoset/video posts.

This script will

* handle texts, photos and photosets ok
* download all images to `wp-content` and attach them to posts
* set post thumbnails where appropriate
* set tags as set in tumblr
* set categories: tumblr and tumblr_yourtumblrsname
* preserve all tumblr data in custom fields (see the script for details) (I use this data to link to tumblrs tag pages and sort of give a historical permalink)

This should go without saying: *TRY AT YOUR OWN RISK*.
If you're scared, create an empty WordPress to experiment.

## Requirements

* A working [WP-CLI](http://wp-cli.org/) installation
* node.js
* BASH + curl + seq
* a [tumblr API key](https://www.tumblr.com/docs/en/api/v2#auth)

## Usage

Two parts: first we download all the data via tumblr's API, then we feed it to your WordPress.

### Part 1

`./download.sh fyeahwp.tumblr.com YOURAPIKEYdfwei93jagADFS`

This outputs a shell script to stdout, to give you an idea what it will do:

* create a folder named `fyeahwp.tumblr.com`
* download a bunch of json files into this folder

If OK:

`./download.sh fyeahwp.tumblr.com YOURAPIKEYdfwei93jagADFS | bash`

### Part 2

```
cd /srv/http/my-new-wordpress
/path/to/this/tool/process.sh /path/to/this/tool/fyeahwp.tumblr.com
```

## Bugs

Lots. Among others:

* doesn't handle reblogs well (partly due to their tumblr-native nature)
* videos don't really work
* images embedded in text posts won't be updated, but hotlinked
* does not set a post_author

## More obscure bugs

* when a tumblr tag contains a backslash, there is too much weird escpaing going on. not investigating, json cleaned manually
* sometimes WP-CLI chokes on a meta update with tumblr_post json - could not find any reason, workaround: paste the json into custom field in wp-admin
