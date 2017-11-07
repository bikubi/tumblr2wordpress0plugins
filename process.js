#!/usr/bin/env node

if (process.argv.length < 3) {
	console.error('USAGE: process.js PATH [FILTER]\nPATH is a directory that contains json-files (no trailing slash!)\nFILTER is a tumblr post id (int) or a tumblr post type (photo, photoset, video, text, quote...)')
	process.exit(1);
}

var
	url = process.argv[2],
	filterPosts = process.argv[3],
	tumblrName = url.match(/[^\/]+$/)[0],
	fs = require('fs'),
	exec = require('child_process').execSync,
	spawn = require('child_process').spawnSync,
	guids = JSON.parse(exec('wp post list --post_type=any --fields=ID,guid --format=json')),
	tablePosts = 'wp_posts';

console.log('scanning ' + url);
console.log('guids:', guids);

function getIdByGuid (guid) {
	var find = guids.find(function (item) {
		return item.guid === guid;
	});
	return find && find.ID ? find.ID : false;
}

function qSpawn (cmd, args, quiet, noncritical) {
	var spawned = spawn(cmd, args), ret;
	console.log('> ' + cmd + ' ' + args.join(' '));
	if (spawned.status !== 0) {
		console.error(spawned.stderr.toString());
		if (!noncritical) {
			process.exit(1);
		}
		else {
			return false;
		}
	}
	else {
		ret = spawned.stdout.toString();
		if (!quiet) {
			console.log(ret);
		}
		if (args.indexOf('--porcelain')) {
			return ret.trim();
		}
		return ret;
	}
}

function postMedia (wpPostId, mediaUrl, title, caption, isFeatured, json) {
	var 
		srcFn = mediaUrl.match(/[^\/]+$/)[0],
		//dstFn = post.slug + '.' + srcFn,
		localPath = url + '/' + srcFn,
		wpMediaId = getIdByGuid(mediaUrl),
		mediaArgs;
	console.log(localPath, 'wpId', wpPostId, 'wpMediaId', wpMediaId);
	if (!fs.existsSync(localPath)) {
		qSpawn('wget', [mediaUrl, '-O', localPath], false);
	}
	if (wpMediaId) {
		qSpawn('wp', ['post', 'delete', wpMediaId, '--force'], false);
	}
	mediaArgs = ['media', 'import', localPath, '--post_id=' + wpPostId,
		'--title=' + title, '--porcelain'
	];
	if (caption) {
		mediaArgs.push('caption', caption);
	}
	if (isFeatured) {
		mediaArgs.push('--featured_image');
	}
	wpMediaId = qSpawn('wp', mediaArgs);
	qSpawn('wp', ['db', 'query', 'UPDATE `' + tablePosts + '` SET guid=\'' + mediaUrl + '\' WHERE ID=' + wpMediaId], false);
	if (false === qSpawn('wp', ['post', 'meta', 'update', wpMediaId, 'tumblr_json', JSON.stringify(json)], false, true)) {
		qSpawn('wp', ['post', 'meta', 'update', wpMediaId, 'tumblr_json', Buffer.from(JSON.stringify(json)).toString('base64')], false, false);
	}
}

tablePosts = qSpawn('wp', ['db', 'tables', '*posts']);
console.log('posts table: ', tablePosts);
filterPosts = (+filterPosts > 0) ? +filterPosts : filterPosts;

fs.readdir(url, function (err, items) {
	var posts = [];
	items.forEach(function (item) {
		var
			fn = url + '/' + item,
			o;
		if (item.match(/^\d+\.json$/) === null) {
			return;
		}
		o = require(fn);
		posts = posts.concat(o.response.posts);
		console.log('read ' + fn + ', ' + o.response.posts.length + ' posts');
	});
	console.log('= ' + posts.length + ' posts');
	var types = {};
	posts.forEach(function (post) {
		var postType = post.type;
		if (post.photos && (post.photos.length > 1)) {
			postType = 'photoset';
		}
		types[postType] = types[postType] + 1 || 1;
		post.type_proc = postType;
	});
	console.log('post types: ', types);
	posts.forEach(function (post) {
		var
			guid = post.post_url,
			wpId;
		switch (typeof filterPosts) {
		case 'number':
			if (post.id !== filterPosts) return;
			break;
		case 'string':
			if (post.type !== filterPosts) return;
			break;
		case 'undefined':
		default:
			//noop
		}
		wpId = getIdByGuid(guid);
		if (!wpId) {
			wpId  = qSpawn('wp', ['post', 'create', '--guid=' + guid, '--porcelain', '--post_content=&nbsp;', '--post_title=']);
		}
		qSpawn('wp', ['post', 'update', wpId,
			'--post_title=' + post.summary,
			'--post_content=' + (post.type === 'text' ? post.body : (post.caption ? post.caption : '&nbsp;')),
			'--post_status=publish'
		], false);
		qSpawn('wp', ['post', 'update', wpId,
			'--post_date=' + post.date.substr(0, 19),
			'--post_date_gmt=' + post.date.substr(0, 19)
		], false);
		qSpawn('wp', ['post', 'meta', 'update', wpId, 'tumblr_id',   post.id], false);
		if (false === qSpawn('wp', ['post', 'meta', 'update', wpId, 'tumblr_post', JSON.stringify(post)], false, true)) {
			qSpawn('wp', ['post', 'meta', 'update', wpId, 'tumblr_post', Buffer.from(JSON.stringify(post)).toString('base64')], false, false);
		}
		qSpawn('wp', ['post', 'meta', 'update', wpId, 'tumblr_tags', post.tags.join(',').replace('\\', '')], false);
		qSpawn('wp', ['post', 'term', 'set',    wpId, 'category',    'tumblr', tumblrName, 'tumblr_' + post.type_proc], false);
		if (post.photos) post.photos.forEach(function (photo, photoIdx) {
			postMedia(wpId, photo.original_size.url, post.summary, photo.caption, photoIdx === 0, photo);
		});
		if (post.player) {
			post.player.sort(function (a, b) {
				return b.width - a.width;
			});
			qSpawn('wp', ['post', 'update', wpId, '--post_content=' + post.player[0].embed_code]);
			if (post.video_type === 'tumblr') {
				postMedia(wpId, post.video_url, post.summary, null, false, '');
			}
			postMedia(wpId, post.thumbnail_url, post.summary, null, true, '');
		}

	});
});
