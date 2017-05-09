/**
 * Perfect Ostrove Blossom Math.
 * Alex Striff.
 */

function Expression() /* RPN arguments. */
{
	this.op   = arguments.shift();
	this.args = arguments;
}

Expression.prototype.$ = function() {
	if (this.op !== Object(this.op)) {
		return this.op; /* Identity if primitive. */
	} else {
		return this.op(args);
	}
};

var operators = [
	add,
	sub,
	mult,
	div,
];

var PHI = (1 + Math.sqrt(5)) / 2;
var PI  = Math.PI;
var TAU = 2 * Math.PI;

function un_argf(f)  { return function(x) {f(x[0]);} }
function bin_argf(f) { return function(x) {f(x[0], x[1]);} }

function add(a)  { return a[0] + a[1]; }
function sub(a)  { return a[0] - a[1]; }
function mult(a) { return a[0] * a[1]; }
function div(a)  { return a[0] / a[1]; }
var pow = bin_argf(Math.pow);

var floor = bin_argf(Math.floor);
var round = bin_argf(Math.round);
var ceil  = bin_argf(Math.ceil);

var sin  = un_argf(Math.sin);
var cos  = un_argf(Math.cos);
var tan  = un_argf(Math.tan);
var asin = un_argf(Math.asin);
var acos = un_argf(Math.acos);
var atan = un_argf(Math.atan);

