/**
 * Perfect Ostrove Blossom.
 * Alex Striff.
 */

var WIDTH  = 3 * 100;
var HEIGHT = 4 * 100;
var FPS    = 120;
var DELAY  = 1e3 / FPS;

//var IWIDTH  = 4 * 50;
var IWIDTH  = 12 * 50;
var IHEIGHT = 3 * 50;

var PHI    = (1 + Math.sqrt(5)) / 2;

var canvas    = document.getElementById("bullet_canvas");
canvas.width  = WIDTH;
canvas.height = HEIGHT;
var c         = canvas.getContext("2d");

var icanvas    = document.getElementById("info_canvas");
icanvas.width  = IWIDTH;
icanvas.height = IHEIGHT;
var info       = icanvas.getContext("2d");

var frames  = 0;
var game_loop;

var bullets = [];

var density;
var density_res  = IWIDTH;
var density_data = [];
var bullet_data  = [];

var loops          = 0;
var floops         = 0;
var loop_timeouts  = [];
var loop_kill_reqs = [];
var loop_frames    = [];
var scheduling     = false;

function Bullet(x, y, t, v, r)
{
	this.x = x;
	this.y = y;
	this.t = t;
	this.v = v;
	this.r = r || 5;
	bullets.push(this);
}

function run_frames()
{
	for (var i = 0; i < floops; i++) {
		if (frames % loop_frames[i].fmod === 0) {
			loop_frames[i].func();
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
		loops--;
	}
}

function plot_density(density)
{
	density_data.shift();
	density_data.push(density);

	bullet_data.shift();
	bullet_data.push(bullets.length);

	var max = bmax = 0, min = 1, bmin = 31337;
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
	var data = c.getImageData(0, 0, WIDTH, HEIGHT).data;
	var acc = 0;
	for (var x = 0; x < WIDTH; x++) {
		for (var y = 0; y < HEIGHT; y++) {
			var i = 4 * (x + (y * WIDTH));
			if (data[0] + data[i + 1] + data[i + 2]) {
				acc++;
			}
		}
	}

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
	for (var i = 0; i < bullets.length; i++) {
		var b = bullets[i];

		//if (-WIDTH > b.x || b.x > 2*WIDTH || -HEIGHT > b.y || b.y > 2*HEIGHT) {
		if (-WIDTH/2 > b.x || b.x > 3*WIDTH/2 || -HEIGHT/2 > b.y || b.y > 3*HEIGHT/2) {
			bullets.splice(i, 1);
		} else {
			b.x += b.v * Math.cos(b.t);
			b.y += b.v * Math.sin(b.t);
		}
	}
}

function spiral(x, y, d, t, v, r)
{
	new Bullet(x, y, t, v, r);
}

function circle(x, y, d, p, v, r)
{
	for (var t = 0; t < 2*Math.PI; t += 2*Math.PI/d) {
		new Bullet(x, y, t + p, v, r);
	}
}

function asteroid(d, v, r)
{
	for (var t = 0; t < 2*Math.PI; t += 2*Math.PI/d) {
		var x = (WIDTH  / 2) + WIDTH*Math.pow(Math.cos(t), 3);
		var y = (HEIGHT / 2) + WIDTH*Math.pow(Math.sin(t), 3);
		new Bullet(x, y, Math.PI + t, v, r);
	}
}

function render()
{
	c.fillStyle = "#000";
	c.fillRect(0, 0, WIDTH, HEIGHT);

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

	plot_density(density);
}

function init()
{
	console.log("Running Perfect Ostrove Blossom.");
	for (var i = 0; i < density_res; i++) {
		density_data[i] = bullet_data[i] = 0;
	}

	game_loop = schedule_loop(function() {
		run_frames();
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

	var pa, pb, d;
	pa = pb = 0;
	d = 64;

	schedule_frames(function(){asteroid(200, 1, 2);}, 3.75*FPS, true);

	//schedule_frames(function(){spiral(WIDTH/2, 0, d, 2*Math.PI*PHI*pb++/d, 0.1, 2);}, 1);

	// schedule_frames(function(){circle(0,       0,        d, 2*Math.PI*PHI*pb++/d, 0.1, 2);}, 0.5*FPS);
	// schedule_frames(function(){circle(WIDTH,   0,        d, 2*Math.PI*PHI*pb++/d, 0.1, 2);}, 0.5*FPS);
	// schedule_frames(function(){circle(0,       HEIGHT,   d, 2*Math.PI*PHI*pb++/d, 0.1, 2);}, 0.5*FPS);
	// schedule_frames(function(){circle(WIDTH,   HEIGHT,   d, 2*Math.PI*PHI*pb++/d, 0.1, 2);}, 0.5*FPS);
}

init();

