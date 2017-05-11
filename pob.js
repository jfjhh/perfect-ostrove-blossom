/**
 * Perfect Ostrove Blossom.
 * Alex Striff.
 */

"use strict";

var WIDTH  = 3 * 100;
var HEIGHT = 4 * 100;
var FPS    = 120;
var DELAY  = 1e3 / FPS;

//var IWIDTH  = 4 * 50;
var IWIDTH	= 12 * 50;
var IHEIGHT = 3 * 50;

var PHI    = (1 + Math.sqrt(5)) / 2;

var back    = document.getElementById("bg_canvas");
back.width  = WIDTH;
back.height = HEIGHT;
var bg      = back.getContext("2d");

var canvas	  = document.getElementById("bullet_canvas");
canvas.width  = WIDTH;
canvas.height = HEIGHT;
var c		  = canvas.getContext("2d");

var overlay    = document.getElementById("overlay_canvas");
overlay.width  = WIDTH;
overlay.height = HEIGHT;
var over	   = overlay.getContext("2d");
var overlay_on = true;


var sprite	  = document.getElementById("sprite_canvas");
sprite.width  = WIDTH;
sprite.height = HEIGHT;
var s		  = sprite.getContext("2d");

var icanvas    = document.getElementById("info_canvas");
icanvas.width  = IWIDTH;
icanvas.height = IHEIGHT;
var info	   = icanvas.getContext("2d");

var frames	= 0;
var game_loop;

var bullets = [];
var danmaku = [];

var density;
var density_res  = IWIDTH;
var density_data = [];
var bullet_data  = [];

var loops		   = 0;
var floops		   = 0;
var loop_timeouts  = [];
var loop_kill_reqs = [];
var loop_frames    = [];
var scheduling	   = false;

/*
function Bullet(x, y, t, v, r)
{
	this.x = x;
	this.y = y;
	this.t = t;
	this.v = v;
	this.r = r || 3;
	bullets.push(this);
}
*/

function Bullet(x, y, r)
{
	this.x = x;
	this.y = y;
	this.r = r || 3;
}

function Player()
{
	this.x = WIDTH / 2;
	this.y = HEIGHT * (PHI - 1);
	this.r = 3;				/**< Hitbox radius. */
	this.s = PHI / 2;		/**< Speed. */
	this.fs = 3;			/**< Focused speed ratio. */
	this.l = 5;				/**< Lives. */
	this.v = false;
	this.iframe = false;
	this.ul = undefined;
	this.ll = undefined;
	this.uu = true;
	this.du = true;
	this.lu = true;
	this.ru = true;

	this.color = "#F8F";
}

var player = new Player();

function Danmaku(x, y, ti, v, r, n, f)
{
	/**
	 * These are mostly functions of ti and time (frames).
	 */
	/* The initial time. */
	this.t0 = frames;

	/* x position of a bullet from ti. */
	this.x	= x;

	/* y position of a bullet from ti. */
	this.y	= y;

	/* Instantaneous angle function. Something like a phase shift. */
	this.ti = ti;

	/* Velocity function. */
	this.v	= v;

	/* Bullet radius function. TODO: Handle different bullet shapes?. */
	this.r	= r;

	/* The number of bullets. Related to the density. */
	this.n	= n;

	/* How frequent the entire pattern is. Functions will likely be continuous,
	 * so this discretizes them. */
	this.f	= f;

	/* Bullet list. */
	this.bullets = [];

	danmaku.push(this);
}

Danmaku.prototype.run = function(t) {
	var time   = _v("t", t - this.t0);
	var n_val  = this.n.$(args);
	var ti_val = ti.$([t, _v("n", n_val)]);

	var args = [t, _v("ti", ti_val)];

	// var x  = this.x.$(args);
	// var y  = this.y.$(args);
	// var ti = this.ti.$(args);
	// var tf = this.tf.$(args);
	// var v  = this.v.$(args);
	// var r  = this.r.$(args);

	/**
	 * Problem: Turn a function of the time and number into a function
	 * dependent upon the number only, where the number is a function of the
	 * time.
	 *
	 * TL;DR Implement partial application of functions?
	 */
	for (var i = 0; i < n; i++) {
		var param = ti.$([t, _v("n", n_val)]);
		this.bullets.push(new Bullet(x, y, r));
	}
};

function run_frames()
{
	for (var i = 0; i < floops; i++) {
		if (frames % loop_frames[i].fmod === 0) {
			if (loop_frames[i].func() === -1) {
				loop_frames[i].kill = true;
			}
		}
	}
}

function schedule_frames(f, mod_frames)
{
	while (scheduling);
	scheduling = true;
	loop_frames[floops] = {
		func: f,
		fmod: Math.round(mod_frames),
		kill: false,
	}
	scheduling = false;
	return floops++;
}

function schedule_loop(f, wait, now)
{
	while (scheduling);
	scheduling = true;
	if (now === undefined) {
		now = true;
	}
	loop_kill_reqs[loops] = false;
	var id = loops;
	setTimeout(function(){loop(f, wait, id);}, now ? 0 : wait);
	scheduling = false;
	return loops++;
}

function loop(f, wait, id)
{
	var before = Date.now();
	f();
	var after  = Date.now();

	var delay = wait - (after - before);
	if (delay < 0) {
		delay = 0;
	}

	if (!loop_kill_reqs[id]) {
		loop_timeouts[id] = setTimeout(function(){loop(f, wait, id);}, delay);
	} else {
		clearTimeout(loop_timeouts[id]);
		loops--;
	}
}

function plot_density(density)
{
	density_data.shift();
	density_data.push(density);

	bullet_data.shift();
	bullet_data.push(bullets.length);

	var max = 0, bmax = 0, min = 1, bmin = 31337;
	for (var i = 0; i < density_data.length; i++) {
		var d = density_data[i];
		var b = bullet_data[i];
		if (d > max) {
			max = d;
		}
		if (d < min) {
			min = d;
		}
		if (b > bmax) {
			bmax = b;
		}
		if (b < bmin) {
			bmin = b;
		}
	}

	var h = IHEIGHT / 32;
	var maxh = IHEIGHT - 2 * h;
	info.fillStyle = "#000";
	info.fillRect(0, 0, IWIDTH, IHEIGHT);

	info.fillStyle = "rgba(255, 128, 255, " + Math.min(1, WIDTH / density_res) + ")";
	for (var i = 0; i < density_data.length; i++) {
		var d = density_data[i];

		info.fillStyle = "rgba(255, 128, 255, " + Math.min(1, WIDTH / density_res) + ")";
		info.fillRect(IWIDTH * i / density_res,
			(maxh/(max-min)) * (max - density_data[i]) + h, 1, 1);

		info.fillStyle = "rgba(255, 128, 128, " + Math.min(1, WIDTH / density_res) + ")";
		info.fillRect(IWIDTH * i / density_res,
			(maxh/(bmax-bmin)) * (bmax - bullet_data[i]) + h, 1, 1);
	}

	var size = 9;
	info.fillStyle = "rgba(0, 0, 0, 0.5)";
	info.fillRect(IWIDTH - 7 * size, IHEIGHT - 2 * size - 3 * h, IWIDTH, IHEIGHT);
	info.fillStyle = "#FFF";
	info.font = size + "px Courier New";
	info.fillText("Num: " + bullets.length, IWIDTH - 7 * size, IHEIGHT - 2 * size - h);
	info.fillText("Min: " + min.toFixed(4), IWIDTH - 7 * size, IHEIGHT - size - h);
	info.fillText("Max: " + max.toFixed(4), IWIDTH - 7 * size, IHEIGHT - h);
}

function calc_density()
{
	var ocan  = over.getImageData(0, 0, WIDTH, HEIGHT);
	//var odata = ocan.data;
	var data  = c.getImageData(0, 0, WIDTH, HEIGHT).data;
	var acc   = 0;
	for (var x = 0; x < WIDTH; x++) {
		for (var y = 0; y < HEIGHT; y++) {
			var i = 4 * (x + (y * WIDTH));
			if (data[i + 0] + data[i + 1] + data[i + 2]) {
				// ocan.data[i + 0]  = data[i + 0];
				// ocan.data[i + 1]  = data[i + 1];
				// ocan.data[i + 2]  = data[i + 2];
				if (ocan.data[i + 3] < 255) {
					ocan.data[i + 3] += 1;
				}
				ocan.data[i + 0]  = ocan.data[i + 3];
				ocan.data[i + 1]  = 128 - ocan.data[i + 3] / 2;
				ocan.data[i + 2]  = 255 - ocan.data[i + 3];
				acc++;
			} else {
				if (ocan.data[i + 3] > 0) {
					ocan.data[i + 3] -= 0.5;
				}
			}
		}
	}

	over.putImageData(ocan, 0, 0);
	return acc / (WIDTH * HEIGHT);
}

/*
function hausdorff(d)
{
	var data = c.getImageData(0, 0, WIDTH, HEIGHT).data;
	var boxes = [];

	for (var x = 0; x < WIDTH; x++) {
		for (var y = 0; y < HEIGHT; y++) {
			var i = 4 * (x + (y * WIDTH));
			if (data[i + 1] + data[i + 2] + data[i + 3]) {
				boxes[Math.floor(x/d)
					+ Math.floor(WIDTH/d)*Math.floor(y/d)]
					= 1;
				c.fillStyle = "rgba(0, 255, 0, 0.125)";
				c.fillRect(d*Math.floor(x/d),
					d*Math.floor(y/d), d, d);
			}
		}
	}

	var total = 0;
	c.strokeStyle = "rgba(255, 128, 255, 0.5)";
	for (var i = 0; i < (WIDTH * HEIGHT) / (d * d); i++) {
		c.strokeRect((i % Math.floor(WIDTH/d)) * d,
			d*Math.floor(i*d/WIDTH), d, d);
		if (boxes[i]) {
			total++;
		}
	}

	console.log("<Hausdorff>\tTotal: " + total + "\tD: " + d);

	return Math.log(total) / Math.log(1 / d);
}
*/

function update()
{
	// var hx_min = player.x - player.r;
	// var hx_max = hx_min	 + 2 * player.r;
	// var hy_min = player.y - player.r;
	// var hy_max = hy_min	 + 2 * player.r;

	// var hx_min = player.x + player.r / 3;
	// var hx_max = hx_min	 + player.r / 3;
	// var hy_min = player.y + player.r / 3;
	// var hy_max = hy_min	 + player.r / 3;

	var hr = player.r;
	var hx = player.x;
	var hy = player.y;

	var was_hit = false;
	for (var i = 0; i < bullets.length; i++) {
		var b = bullets[i];

		//if (-WIDTH > b.x || b.x > 2*WIDTH || -HEIGHT > b.y || b.y > 2*HEIGHT) {
		if (-WIDTH/2 > b.x || b.x > 3*WIDTH/2 || -HEIGHT/2 > b.y || b.y > 3*HEIGHT/2) {
			bullets.splice(i, 1);
			continue;
		}

		// b.x += b.v * Math.cos(b.t);
		// b.y += b.v * Math.sin(b.t);

		// var sx = bullets[i].x + bullets[i].r;
		// var sy = bullets[i].y + bullets[i].r;

		var sx = bullets[i].x;
		var sy = bullets[i].y;
		var sr = bullets[i].r;

		var sx_min = bullets[i].x - bullets[i].r;
		var sy_min = bullets[i].y - bullets[i].r;
		var sx_max = bullets[i].x + 2 * bullets[i].r;
		var sy_max = bullets[i].y + 2 * bullets[i].r;

		// if (!player.iframe
		//if (hx_min <= sx && sx <= hx_max && hy_min <= sy && sy <= hy_max) {
		//if (sx_min <= hx && hx <= sx_max && sy_min <= hy && hy <= sy_max) {
		if (Math.sqrt(Math.pow(sx - hx, 2) + Math.pow(sy - hy, 2)) < sr + hr) {
			player.l--;
			//if (player.l <= 0) {
			//die();
			//} else {
			//player.iframe = true;
			was_hit = true;
			c.fillColor = "#000";
			c.strokeColor = "#0F0";
			c.strokeRect(sx_min, sy_min, sx_max, sy_max);
			//player.color	= "#F00";
			/*
					schedule_frames(function() {
						player.iframe = false;
						player.color  = "#F8F";
						return -1;
					}, 10);
					*/
			hit();
			//}
		}

		if (was_hit) {
			player.color = "#F00";
		} else {
			player.color = "#0F0";
		}
	}
}

function die()
{
	//console.log("You died!");
}

function hit()
{
	//console.log("You were hit!");
}

function spiral(x, y, d, t, v, r)
{
	new Bullet(x, y, t, v, r);
}

function track(x, y, p, v, r)
{
	var dx = player.x - x;
	var dy = player.y - y;
	var t  = Math.atan(dy / dx);
	if (player.x < x) {
		t += Math.PI;
	}
	new Bullet(x, y, t + p, v, r);
}

function circle(x, y, d, p, v, r)
{
	for (var t = 0; t < 2*Math.PI; t += 2*Math.PI/d) {
		var angle = _(add, t, p);
		new Bullet(x, y, angle.$(), v, r);
	}
}

function asteroid(d, v, r)
{
	var argv = v;
	for (var t = 0; t < 2*Math.PI; t += 2*Math.PI/d) {
		var x = _(add, _(div, WIDTH, 2), _(mul, WIDTH, _(pow, _(cos, _v("t")), 3)));
		var y = _(add, _(div, HEIGHT, 2), _(mul, WIDTH, _(pow, _(sin, _v("t")), 3)));
		var v = _(add, 1, _(mul, 0.01, _(rand)));
		var v = _(id, _v("v"));
		var vs = [_v("t", t), _v("v", argv)];
		new Bullet(x.$(vs), y.$(vs), Math.PI + t, v.$(vs), r);
	}
}

function render()
{
	/* Clear BG. */
	c.clearRect(0, 0, WIDTH, HEIGHT);
	s.clearRect(0, 0, WIDTH, HEIGHT);

	/* Bullets. */
	c.fillStyle = "#F00";
	c.fillRect(WIDTH/2 - 1, HEIGHT/2 - 1, 2, 2);
	for (var i = 0; i < bullets.length; i++) {
		var b = bullets[i];
		if (0 < b.x && b.x < WIDTH && 0 < b.y && b.y < HEIGHT) {
			c.fillStyle = "#FFF";
			c.beginPath();
			c.arc(b.x, b.y, b.r, 0, Math.PI*2, true);
			c.closePath();
			c.fill();
		}
	}

	/* Player. */
	//s.globalCompositeOperation = "destination-over";
	s.fillStyle = s.strokeStyle = player.color;
	// s.fillRect(player.x, player.y, 2 * player.r, 2 * player.r);
	s.beginPath();
	s.arc(player.x, player.y, player.r, 0, 2 * Math.PI, true);
	s.closePath();
	s.fill();
	//s.globalCompositeOperation = "source-over";

	/* Info. */
	plot_density(density);
}

function input()
{
	var dx, dy;

	if (!(player.uu || player.du)) {
		if (player.ul) {
			dy = -1;
		} else {
			dy = 1;
		}
	} else if (!(player.uu)) {
		dy = -1;
	} else if (!(player.du)){
		dy = 1;
	} else {
		dy = 0;
	}

	if (!(player.lu || player.ru)) {
		if (player.ll) {
			dx = -1;
		} else {
			dx = 1;
		}
	} else if (!(player.lu)) {
		dx = -1;
	} else if (!(player.ru)){
		dx = 1;
	} else {
		dx = 0;
	}

	var xf = player.x + (player.s * dx);
	var yf = player.y + (player.s * dy);
	var hw = player.r;

	if (xf < 0) {
		xf = 1;
	} else if (xf > 320 - hw) {
		xf = 320 - hw - 1;
	}

	if (yf < 0) {
		yf = 1;
	} else if (yf > 450 - hw) {
		yf = 450 - hw - 1;
	}

	player.x = xf;
	player.y = yf;
}

function init()
{
	console.log("Running Perfect Ostrove Blossom.");

	frames	= 0;
	game_loop;
	
	bullets = [];
	
	density;
	density_res  = IWIDTH;
	density_data = [];
	bullet_data  = [];
	
	loops		   = 0;
	floops		   = 0;
	loop_timeouts  = [];
	loop_kill_reqs = [];
	loop_frames    = [];
	scheduling	   = false;

	for (var i = 0; i < density_res; i++) {
		density_data[i] = bullet_data[i] = 0;
	}

	over.fillStyle = "rgba(0, 0, 0, 0)";
	over.fillRect(0, 0, WIDTH, HEIGHT);

	game_loop = schedule_loop(function() {
		run_frames();
		input();
		update();
		render();
		frames++;
	}, DELAY);

	schedule_loop(function() {
		var d = calc_density();
		if (d !== 1) {
			density = d;
		}
	}, DELAY);

	schedule_frames(function() {
		over.clearRect(0, 0, WIDTH, HEIGHT);
	}, 10*FPS);

	var pa, pb, d;
	pa = pb = 0;
	d = 3;

	// schedule_frames(function(){asteroid(50, 1);}, 3.75*FPS, true);

	schedule_frames(function(){spiral(WIDTH/2, 0, d, 2*Math.PI*PHI*pb++/d, 0.25);}, 1);

	schedule_frames(function(){track(WIDTH/2, HEIGHT/5, 0,			  0.5);}, 32);
	// schedule_frames(function(){track(WIDTH/2, HEIGHT/5, Math.PI  / 8, 0.5);}, 32);
	// schedule_frames(function(){track(WIDTH/2, HEIGHT/5, -Math.PI / 8, 0.5);}, 32);

	// schedule_frames(function(){circle(WIDTH / 2, HEIGHT / 5, d, 2*Math.PI*PHI*pb++/d, 0.25);}, 1.0*FPS);
}

init();

window.onkeydown = function(event)
{
	switch (event.keyCode) {
		case 38: /* Up. */
		case 87: /* W.	*/
			if (player.uu) {
				player.uu = false;
				player.ul = true;
			}
			break;
		case 40: /* Down. */
		case 83: /* S.	  */
			if (player.du) {
				player.du = false;
				player.ul = false;
			}
			break;
		case 37: /* Left. */
		case 65: /* A.	  */
			if (player.lu) {
				player.lu = false;
				player.ll = true;
			}
			break;
		case 39: /* Right. */
		case 68: /* D.	   */
			if (player.ru) {
				player.ru = false;
				player.ll = false;
			}
			break;
		case 16: /* Shift. */
			if (!(player.v)) {
				player.s /= player.fs;
				player.v  = true;
				// setImageURL("player", "ostrove_hitbox.png");
			}
			break;
		case 27: /* ESC. */
			for (var i = 0; i < loops; i++) {
				loop_kill_reqs[i] = true;
			}
			break;
		case 81: /* Q.	 */
			if (overlay_on) {
				overlay.style.visibility = "hidden";
			} else {
				overlay.style.visibility = "visible";
			}
			overlay_on = !overlay_on;
			//stop_game(true);
			break;
		case 82: /* R.	 */
			for (var i = 0; i < loops; i++) {
				loop_kill_reqs[i] = true;
			}
			setTimeout(init, 100);
			break;
		default:
			// console.log(event.keyCode);
			break;
	}
};

window.onkeyup = function()
{
	switch (event.keyCode) {
		case 38: /* Up. */
		case 87: /* W.	*/
			player.uu = true;
			break;
		case 40: /* Down. */
		case 83: /* S.	  */
			player.du = true;
			break;
		case 37: /* Left. */
		case 65: /* A.	  */
			player.lu = true;
			break;
		case 39: /* Right. */
		case 68: /* D.	   */
			player.ru = true;
			break;
		case 16: /* Shift. */
			player.s *= player.fs;
			player.v  = false;
			// setImageURL("player", "ostrove_head.png");
			break;
		default:
			break;
	}
};

