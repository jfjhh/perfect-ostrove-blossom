/**
 * Perfect Ostrove Blossom.
 * Alex Striff.
 */

"use strict";

/**
 * Global Variables.
 */

var FPS            = 120;
var DELAY          = 1e3 / FPS;
var DANMAKU_FRAMES = 4;

var calc_fps_b     = 0;
var calc_fps_a     = 0;
var calc_fps_out   = 0;

var WIDTH          = 3 * 100;
var HEIGHT         = 4 * 100;

var IWIDTH         = 12 * 50;
var IHEIGHT        = 3  * 50;

var PHI            = (1 + Math.sqrt(5)) / 2;

var back           = document.getElementById("bg_canvas");
back.width         = WIDTH;
back.height        = HEIGHT;
var bg             = back.getContext("2d");

var canvas         = document.getElementById("bullet_canvas");
canvas.width       = WIDTH;
canvas.height      = HEIGHT;
var c              = canvas.getContext("2d");

var overlay        = document.getElementById("overlay_canvas");
overlay.width      = WIDTH;
overlay.height     = HEIGHT;
var over           = overlay.getContext("2d");
var overlay_on     = true;


var sprite         = document.getElementById("sprite_canvas");
sprite.width       = WIDTH;
sprite.height      = HEIGHT;
var s              = sprite.getContext("2d");

var icanvas        = document.getElementById("info_canvas");
icanvas.width      = IWIDTH;
icanvas.height     = IHEIGHT;
var info           = icanvas.getContext("2d");

var game_loop;
var frames         = 0;

var danmaku        = [];

var density;
var density_res    = IWIDTH;
var density_data   = [];
var bullet_data    = [];

var loops          = 0;
var floops         = 0;
var loop_timeouts  = [];
var loop_kill_reqs = [];
var loop_frames    = [];
var scheduling     = false;


/**
 * Makes a new bullet with radius `r` at the given `x` and `y` coordinates.
 */
function Bullet(x, y, r)
{
	this.x = x;
	this.y = y;
	this.r = r || 3;
}


/**
 * Player object that includes flags for handling movement input.
 */
function Player(x, y)
{
	this.x      = x || WIDTH / 2;          /* Initial x position.         */
	this.y      = y || HEIGHT * (PHI - 1); /* Initial y position.         */
	this.r      = 3;                       /* Hitbox radius.              */
	this.s      = PHI / 2;                 /* Speed.                      */
	this.fs     = 3;                       /* Focused speed divisor.      */
	this.l      = 5;                       /* Lives.                      */
	this.v      = false;                   /* Focus flag.                 */
	this.iframe = false;                   /* Invincibility flag.         */
	this.ul     = undefined;               /* Up last key flag.           */
	this.ll     = undefined;               /* Left last key flag.         */
	this.uu     = true;                    /* Up key up flag.             */
	this.du     = true;                    /* Down key up flag.           */
	this.lu     = true;                    /* Left key up flag.           */
	this.ru     = true;                    /* Right key up flag.          */
	this.color  = "#0F0";                  /* Color of the player hitbox. */
}

var player = new Player(WIDTH / 2, 7 * HEIGHT / 8);


/**
 * Danmaku constructor.
 *
 * All of the arguments except for `subs` are Strings that will be interpreted
 * into Expressions for their respective quantities. `subs` contains objects to
 * substitute into those Expressions. For example, the Expression `(= a)` as a
 * parameter would need subs to contain something like `{ a: 42 }`. The *key*
 * name of the member of `subs` is used for replacing in the other parameters.
 * `subs` may also contain String Expressions to make life easier. Say many
 * parameters use `(/ i n)` in their Expressions. These parameters could replace
 * `(/ i n)` with a variable like `ratio`, and `subs` could contain
 * `ratio: "(/ i n)"`. All members of `subs` are also cross-substituted into
 * each other, so in the case of `subs` containing `b: "(+ a 1)"` and `a: 9000`,
 * everything will work as expected.
 */
function Danmaku(x, y, t, r, n, i, f, subs)
{
	var vars = [];
	var keys = [];
	if (subs) {
		keys = Object.keys(subs);
		for (var i = 0; i < keys.length; i++) {
			if (Number.isFinite(subs[keys[i]])) { /* Number. */
				vars.push(generate_variable(keys[i], subs[keys[i]], true));
			} else { /* String expression that needs to be replaced. */
				for (var j = 0; j < keys.length; j++) {
					if (!Number.isFinite(subs[keys[j]])) { /* Not a number. */
						while (subs[keys[i]].includes(keys[j])) {
							subs[keys[i]]
								= subs[keys[i]].replace(keys[j], subs[keys[j]]);
						}
					}
				}
			}
		}
		for (var i = 0;  i < arguments.length - 1; i++) { /* -1 to avoid subs. */
			for (var j = 0;  j < keys.length; j++) { /* -1 to avoid subs. */
				if (!Number.isFinite(subs[keys[j]])) { /* Not a number. */
					while (arguments[i].includes(keys[j])) {
						arguments[i] = arguments[i].replace(keys[j], subs[keys[j]]);
					}
				}
			}
		}
	}

	for (var i = 0; i < arguments.length - 1; i++) { /* -1 to avoid subs. */
		arguments[i] = _$_(arguments[i]).$(vars);
		if (Number.isFinite(arguments[i])) { /* Number. */
			arguments[i] = _(id, arguments[i]);
		}
	}

	var a        = arguments;
	this.t0      = frames;   /* The initial time.                       */
	this.x       = a[0];     /* x position of a bullet from t.          */
	this.y       = a[1];     /* y position of a bullet from t.          */
	this.t       = a[2];     /* Parameter for all other equations.      */
	this.r       = a[3];     /* Bullet radius function.                 */
	this.n       = a[4];     /* The number of bullets.                  */
	this.i       = a[5];     /* The increment of bullets. Often 1.      */
	this.p       = a[6];     /* The period of the Danmaku is repeated.  */
	this.ttl     = 2 * FPS;  /* Frames until the Danmaku disappears.    */
	this.vars    = vars;     /* Save the variables used in Expressions. */
	this.bullets = [];       /* Internal Danmaku Bullet list.           */
}

/**
 * Forks the Danmaku: the Danmaku is scheduled to run forwards in time.
 * 
 * This entails creating a copy of the Danmaku and using `sched_frames` to run
 * its `run` function. The handle to the scheduler is returned. The danmaku has
 * its `t0` parameter set to the current frame, so the Danmaku will start
 * running from when `fork` is called.
 *
 * To run multiple separate Danmaku of the same kind `d`, at the base Danmaku's
 * given period `p`, which is evaluated into a value by `d.p.$()`:
 *
 *     schedule_frames(d.fork.bind(d), d.p.$());
 *
 * The `bind` is necessary because `fork` references `this` to copy the danmaku,
 * and `this` will have changed in the scope of `schedule_frames`.
 */
Danmaku.prototype.fork = function(death_callback)
{
	/* Copy the base Danmaku. */
	var d = Object.create(Danmaku.prototype);
	for (var key in this) {
		d[key] = this[key];
	}

	d.t0        = frames;
	d.deathfunc = death_callback;
	danmaku.push(d);

	/* Update MathJax. */
	var xmath = MathJax.Hub.getAllJax("x_expr")[0];
	var ymath = MathJax.Hub.getAllJax("y_expr")[0];
	MathJax.Hub.Queue(["Text", xmath,
		"x(t) = " + d.x.toAMString()]);
	MathJax.Hub.Queue(["Text", ymath,
		"y(t) = " + d.y.toAMString()]);

	/* Schedule it to run periodically. */
	var sched_handle = schedule_frames(d.run.bind(d), DANMAKU_FRAMES);
	d.sched_handle   = sched_handle;
	return sched_handle;
}

/**
 * Runs the Danmaku at a moment in time.
 *
 * This populates the Danmaku `bullets` Array with all of the bullets that the
 * Danmaku will have at frame `frame`. This function is not used by the user of
 * Danmaku to draw Danmaku moving with time. For that, see `fork`.
 */
Danmaku.prototype.run = function(frame) {
	this.bullets = [];

	var time   = _v("f", frames - this.t0);

	var t_val = this.t.$(this.vars.concat([time]));
	var t     = _v("t", t_val);

	var n_val  = this.n.$(this.vars.concat([time, t]));
	var num    = _v("n", n_val);
	var i_val  = this.i.$(this.vars.concat([time, t]));

	for (var i = 0; i < n_val; i += i_val) {
		var args = [time, num, t, _v("i", i)];
		var x    = this.x.$(this.vars.concat(args));
		var y    = this.y.$(this.vars.concat(args));
		var r    = this.r.$(this.vars.concat(args));
		this.bullets.push(new Bullet(x, y, r));
	}
};

/**
 * Returns the current number of bullets in a Danmaku.
 */
Danmaku.prototype.numbullets = function()
{
	return this.bullets.length;
};

/**
 * Kill off a Danmaku gracefully.
 */
function kill_danmaku(index)
{
	var dead_danmaku = danmaku.splice(index, 1)[0];
	if (dead_danmaku.sched_handle) {
		loop_frames[dead_danmaku.sched_handle].kill = true;
	}
	if (dead_danmaku.deathfunc) {
		dead_danmaku.deathfunc();
	}
}


/**
 * Scheduler functions.
 */

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

function run_frames()
{
	for (var i = 0; i < floops; i++) {
		if (frames % loop_frames[i].fmod === 0) {
			if (!loop_frames[i].kill) {
				if (loop_frames[i].func() === -1) {
					loop_frames[i].kill = true;
				}
			}
		}
	}
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


/**
 * Calculation functions.
 */

function calc_fps()
{
	calc_fps_b   = calc_fps_a;
	calc_fps_a   = Date.now();
	calc_fps_out = FPS * 1e3 / (calc_fps_a - calc_fps_b);
}

function plot_density(density)
{
	density_data.shift();
	density_data.push(density);

	var n = 0;
	for (var i = 0; i < danmaku.length; i++) {
		n += danmaku[i].numbullets();
	}
	bullet_data.shift();
	bullet_data.push(n);

	var max  = 0
	var bmax = 0
	var min  = 1
	var bmin = 31337;
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

	var h    = IHEIGHT / 32;
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

	var size       = 9;
	info.fillStyle = "rgba(0, 0, 0, 0.75)";
	info.fillRect(IWIDTH - 7 * size, IHEIGHT - 3 * size - 3 * h, IWIDTH, IHEIGHT);
	info.fillStyle = "#FFF";
	info.font      = size + "px Courier New";

	info.fillText("FPS: " + calc_fps_out.toFixed(2), IWIDTH - 7 * size, IHEIGHT - 3 * size - h);
	info.fillText("Num: " + n,                       IWIDTH - 7 * size, IHEIGHT - 2 * size - h);
	info.fillText("Min: " + min.toFixed(4),          IWIDTH - 7 * size, IHEIGHT - size - h);
	info.fillText("Max: " + max.toFixed(4),          IWIDTH - 7 * size, IHEIGHT - h);
}

function calc_density()
{
	var ocan  = over.getImageData(0, 0, WIDTH, HEIGHT);
	var data  = c.getImageData(0, 0, WIDTH, HEIGHT).data;
	var acc   = 0;

	for (var x = 0; x < WIDTH; x++) {
		for (var y = 0; y < HEIGHT; y++) {
			var i = 4 * (x + (y * WIDTH));
			if (data[i + 0] + data[i + 1] + data[i + 2]) {
				if (ocan.data[i + 3] < 255) {
					// ocan.data[i + 3] += 1;
					ocan.data[i + 3] += 8;
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


/**
 * Updates the internal state for the current frame.
 */
function update()
{
	var hr      = player.r;
	var hx      = player.x;
	var hy      = player.y;
	var was_hit = false;

	for (var d = 0; d < danmaku.length; d++) {
		var bullets = danmaku[d].bullets;

		/* Kill the Danmaku if it is past its time to live. */
		if (frames - danmaku[d].t0 > danmaku[d].ttl) {
			kill_danmaku(d);
			continue;
		}

		/* Delete Bullets that are outside the screen. */
		for (var i = 0; i < bullets.length; i++) {
			var b = bullets[i];
			if (-b.r > b.x || b.x > WIDTH + b.r
				|| -b.r > b.y || b.y > HEIGHT + b.r) {
					danmaku[d].bullets.splice(i, 1);
					i--;
				}
		}

		/* Check if the Player is colliding with a Bullet. */
		for (var i = 0; i < bullets.length; i++) {
			var b      = bullets[i];

			var sx     = bullets[i].x;
			var sy     = bullets[i].y;
			var sr     = bullets[i].r;

			var sx_min = bullets[i].x - bullets[i].r;
			var sy_min = bullets[i].y - bullets[i].r;
			var sx_max = bullets[i].x + 2 * bullets[i].r;
			var sy_max = bullets[i].y + 2 * bullets[i].r;

			if (!player.iframe
				&& Math.sqrt(Math.pow(sx - hx, 2) + Math.pow(sy - hy, 2))
					< sr + hr)
			{
				player.iframe = true;
				player.l--;
				if (player.l <= 0) {
					die();
				} else {
					hit();
				}

				was_hit         = true;
				player.color	= "#F00";

				schedule_frames(function() {
					player.iframe = false;
					player.color  = "#0F0";
					return -1;
				}, 1 * FPS);
			}
		}

		/* Kill the Danmaku if all of its Bullets are off screen. */
		if (bullets && bullets.length === 0) {
			kill_danmaku(d);
		}
	}
}

/**
 * Run when the Player's has no lives left.
 */
function die()
{
	console.log("You died!");
}

/**
 * Run when the player is in contact with a bullet and is not in an
 * invincibility period.
 */
function hit()
{
	console.log("You were hit!");
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

/**
 * Renders the internal state for the current frame.
 */
function render()
{
	/* Clear the background of canvases. */
	c.clearRect(0, 0, WIDTH, HEIGHT);
	s.clearRect(0, 0, WIDTH, HEIGHT);

	/* Draw a dot in the center for reference. */
	// c.fillStyle = "#F00";
	// c.fillRect(WIDTH/2, HEIGHT/2, 1, 1);

	/* Draw Danmaku Bullets. */
	for (var d = 0; d < danmaku.length; d++) {
		var bullets = danmaku[d].bullets;
		for (var i = 0; i < bullets.length; i++) {
			var b = bullets[i];
			if (-b.r < b.x && b.x < WIDTH + b.r
				&& -b.r < b.y && b.y < HEIGHT + b.r)
			{
				c.fillStyle = "#FFF";
				c.beginPath();
				c.arc(b.x, b.y, b.r, 0, 2 * Math.PI, true);
				c.closePath();
				c.fill();
			}
		}
	}

	/* Draw Player. */
	s.fillStyle = s.strokeStyle = player.color;
	s.beginPath();
	s.arc(player.x, player.y, player.r, 0, 2 * Math.PI, true);
	s.closePath();
	s.fill();

	/* Draw density and bullet number plots. */
	plot_density(density);
}

/**
 * Handle changing the player's position with user input.
 */
function input()
{
	var dx, dy;

	/* Get changes in direction from flags. */
	if (!player.uu && !player.du) {
		dy = player.ul ? -1 : 1;
	} else if (!player.uu) {
		dy = -1;
	} else if (!player.du){
		dy = 1;
	} else {
		dy = 0;
	}
	if (!player.lu && !player.ru) {
		dx = player.ll ? -1 : 1;
	} else if (!player.lu) {
		dx = -1;
	} else if (!player.ru){
		dx = 1;
	} else {
		dx = 0;
	}

	/* Apply displacement in the correct directions. */
	var xf = player.x + (player.s * dx);
	var yf = player.y + (player.s * dy);

	/* Check bounds. */
	if (xf < player.r) {
		xf = player.r + 1;
	} else if (xf > WIDTH - player.r) {
		xf = WIDTH - player.r - 1;
	}
	if (yf < player.r) {
		yf = player.r + 1;
	} else if (yf > HEIGHT - player.r) {
		yf = HEIGHT - player.r - 1;
	}

	/* Move. */
	player.x = xf;
	player.y = yf;
}

/**
 * Save the canvas image.
 */
var save_index = 0;
function save()
{
	var canvases = [overlay, canvas];
	for (var layer of canvases) {
		layer.toBlob(function(blob) {
			var a      = window.document.createElement("a");
			a.href     = window.URL.createObjectURL(blob, {type: "image/png"});
			a.download = this.id + "_frame_" + ("000" + save_index).slice(-4) + ".png";

			/* Append anchor to body. */
			document.body.appendChild(a);
			a.click();

			/* Remove anchor from body. */
			document.body.removeChild(a);
		}.bind(layer));
	}
	save_index++;
}

/**
 * Initialize and run the whole thing.
 */
function init()
{
	/* Fancy CSS console output. */
	console.log("%c \u273f%c  TouhouStrove 7:%c Perfect%c Ostrove%c Blossom%c  \u273f ",
	"color: #F8F; background: #FEF;",
	"color: #A2F; background: #FEF;",
	"color: #F4F; background: #FEF;",
	"color: #F0F; background: #FEF;",
	"color: #F4F; background: #FEF;",
	"color: #F8F; background: #FEF;");

	/* Reset values. */
	frames         = 0;
	density_res    = IWIDTH;
	density_data   = [];
	bullet_data    = [];
	loops          = 0;
	floops         = 0;
	loop_timeouts  = [];
	loop_kill_reqs = [];
	loop_frames    = [];
	scheduling     = false;

	/* Clear sample memory buffers for plots. */
	for (var i = 0; i < density_res; i++) {
		density_data[i] = bullet_data[i] = 0;
	}

	/* Run the main game loop. */
	game_loop = schedule_loop(function() {
		run_frames();
		input();
		update();
		render();

		/* Calculate the Bullet density. */
		var d = calc_density();
		if (d !== 1) {
			density = d;
		}

		frames++;
	}, DELAY);

	/* Calculate the mean frame rate, every `FPS` frames, which is not always
	 * one second. */
	schedule_frames(calc_fps, FPS);

	/* Clear the heatmap overlay every once in a while. */
	// schedule_frames(function() {
	// 	over.clearRect(0, 0, WIDTH, HEIGHT);
	// }, 10*FPS);

	/* Sophisticated Parametric Danmaku. */
	var m = new Danmaku(
		// "(+ x0 (+ vx (* scalex (- (* ii (cos (* a theta))) (* (cos (* b theta)) (sin (* c theta)))))))", /* x */
		// "(+ y0 (+ vy (* scaley (- (* jj (sin (* d theta))) (sin (* e theta))))))", /* y */
		"(+ x0 (+ vx (* scalex (- (cos (* a theta)) (^ (cos (* b theta)) j)))))", /* x */
		"(+ y0 (+ vy (* scaley (- (sin (* c theta)) (^ (sin (* d theta)) k)))))", /* y */
		"(/ f 1024)",      /* t */
		"(= br)",          /* r */
		"(= num)",         /* n */
		"(= inc)",         /* i */
		"(= wait)",        /* p */
		{/* Substitutions. */
			wait     : 8 * FPS,
			scalex   : 64,
			scaley   : -64,
			a        : 1,
			b        : 80,
			c        : 80,
			d        : 80,
			e        : 60,
			ii       : 1,
			jj       : 2,
			j        : 4,
			k        : 3,
			br       : 1,
			num      : 2048,
			inc      : 1,
			v        : -512,
			x0       : WIDTH  / 2,
			y0       : HEIGHT / 2,
			tau      : TAU,
			theta    : "(* (* tau 1) (/ i n))",
			vx       : "(* (* t v) (cos theta))",
			vy       : "(* (* t v) (sin theta))",
		});

	// schedule_frames(m.fork.bind(m), m.p.$());
	// m.fork();

	/**
	 * Permute.
	 */
	var perm_base = [
		[add, mul],
		[tan, sin, cos],
		[sin, cos],
	];
	var perm_syms = [];
	for (var i = 0; i < perm_base.length; i++) {
		perm_syms[i] = perm_base[i].map(function(op) {
			return op.toString();
		});
	}

	var symsets = perm_syms.map(function(symset) {
		var s = symset.map(function(sym) {
			if (sym === "*") {
				return "\\cdot";
			}
			return sym;
		}).toString().replace(/,/g, "\\enspace ");
		return "\\{" + s + "\\}";
	}).toString().replace(/,/g, " \\enspace\\oplus\\enspace ");
	var perm_elem       = document.getElementById("perm_set");
	perm_elem.innerHTML = "\\[\\mathbf{P\\;:\\enspace}\\mathit{" + symsets + "}.\\]";
	MathJax.Hub.Queue(["Typeset", MathJax.Hub, perm_elem]);

	document.getElementById("max_perms").innerHTML = count_perms_bin(perm_base);
	var perms = perm_funcs(perm_base);

	var consts  = (4 * perm_base.length) - 1; /* Binary only. */
	var cxstr   = "cx";
	var cystr   = "cy";
	var cxamstr = "c_{x_";
	var cyamstr = "c_{y_";

	var subs   = {
		wait     : 8 * FPS,
		cx1      : 32,          /* Scale x. */
		cy1      : 32,          /* Scale y. */
		br       : 3,
		num      : 64,
		inc      : 1,
		v        : 8,
		x_0      : WIDTH  / 2,
		y_0      : HEIGHT / 2,
		tau      : TAU,
		theta    : "(* (* tau 1) (/ i n))",
		v_x      : "(* (* v t) (cos theta))",
		v_y      : "(* (* v t) (sin theta))",
		t1       : "(= theta)", /* Parameter 1. */
		t2       : "(= t)",     /* Parameter 2. */
	};

	var perm      = 0;
	var perm_elem = document.getElementById("cur_perm");
	var next_perm = function(px, py) {
		perm++;
		perm_elem.innerHTML = perm;

		subs.permx = constify(perms[px], cxstr).toString();
		subs.permy = constify(perms[py], cystr).toString();

		for (var i = 2; i <= consts; i++) {
			subs[cxstr + i] = 1;
			subs[cystr + i] = 1;
		}

		var d = new Danmaku(
			"(+ x_0 (+ v_x permx))", /* x */
			"(+ y_0 (+ v_y permy))", /* y */
			"(/ f 8)" ,              /* t */
			"(= br)",                /* r */
			"(= num)",               /* n */
			"(= inc)",               /* i */
			"(= wait)",              /* p */
			subs);

		if (++py > perms.length - 1) {
			py = ++px;
			if (px > perms.length - 1) {
				console.log("Done!");
				return;
			}
		}
		
		MathJax.Hub.Queue(function() {
			over.clearRect(0, 0, WIDTH, HEIGHT);
			d.fork(next_perm.bind(d, px, py));
		});
	};

	next_perm(0, 0);
}

/* Initialize the whole thing. */
// document.addEventListener("DOMContentLoaded", function() {
// 	getScript("../mathjax/MathJax.js?config=AM_HTMLorMML", function() {
// 		init();
// 	});
// }, false);

/* Set flags on user input for player movement and other controls. */
window.onkeydown = function(event)
{
	switch (event.keyCode) {
		case 38: /* Up. */
		case 87: /* W.  */
			if (player.uu) {
				player.uu = false;
				player.ul = true;
			}
			break;
		case 40: /* Down. */
		case 83: /* S.    */
			if (player.du) {
				player.du = false;
				player.ul = false;
			}
			break;
		case 37: /* Left. */
		case 65: /* A.    */
			if (player.lu) {
				player.lu = false;
				player.ll = true;
			}
			break;
		case 39: /* Right. */
		case 68: /* D.     */
			if (player.ru) {
				player.ru = false;
				player.ll = false;
			}
			break;
		case 16: /* Shift. */
			if (!(player.v)) {
				player.s /= player.fs;
				player.v  = true;
			}
			break;
		case 27: /* ESC. */
			for (var i = 0; i < floops; i++) {
				loop_frames[i].kill = true;
			}
			for (var i = 0; i < loops; i++) {
				loop_kill_reqs[i] = true;
			}
			break;
		case 81: /* Q. */
			overlay.style.visibility = overlay_on ? "hidden" : "visible";
			overlay_on               = !overlay_on;
			break;
		case 82: /* R. */
			for (var i = 0; i < floops; i++) {
				loop_frames[i].kill = true;
			}
			for (var i = 0; i < loops; i++) {
				loop_kill_reqs[i] = true;
			}
			setTimeout(init, 100);
			break;
		default:
			break;
	}
};

/* Set flags on user input for player movement. */
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
			break;
		default:
			break;
	}
};

