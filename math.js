/**
 * Perfect Ostrove Blossom Mathematics.
 * Alex Striff.
 */

"use strict";

function Variable(name, value)
{
	this.name = name;
	this.val  = value;
}

function generate_variable(name, value)
{
	return new Variable(name, value);
}

var Var = Variable;
var _v  = generate_variable;

function Expression(a) /* RPN arguments. */
{
	var args  = a;
	this.op   = args.shift();
	this.args = args;
}

function generate_expression() /* RPN arguments. */
{
	var args  = Array.from(arguments);
	return new Expression(args);
}

var Exp = Expression;
var _   = generate_expression;

Expression.prototype.$ = function(a)
{
	return $(this, a);
};

function $(e, a) {
	if (e.name !== undefined) {
		for (var i = 0; i < a.length; i++) {
			if (e.name === a[i].name) {
				return a[i].val;
			}
		}
		return "<" + e.name + "?>";
	} else if (e.op === undefined) {
	       return e; /* Identity if primitive. */
	} else if (e.op !== Object(e.op)) {
		return e.op; /* Identity if primitive. */
	} else {
		return e.op(e.args, a);
	}
};

var PHI = (1 + Math.sqrt(5)) / 2;
var PI  = Math.PI;
var TAU = 2 * Math.PI;

function mon_argf(f) { return function(a, v) {return f();}}
function un_argf(f)  { return function(a, v) {return f($(a[0], v));}}
function bin_argf(f) { return function(a, v) {return f($(a[0], v), $(a[1], v));}}

// function un_argf(f)  { return function(x)    { return f($(x)); }}
// function bin_argf(f) { return function(x, y) { return f($(x), $(y)); }}

function p_add(a, b) { return a + b; }
function p_sub(a, b) { return a - b; }
function p_mul(a, b) { return a * b; }
function p_div(a, b) { return a / b; }

var id    = un_argf(function(x){return x;});

var add   = bin_argf(p_add);
var sub   = bin_argf(p_sub);
var mul   = bin_argf(p_mul);
var div   = bin_argf(p_div);

var pow   = bin_argf(Math.pow);

var floor = bin_argf(Math.floor);
var round = bin_argf(Math.round);
var ceil  = bin_argf(Math.ceil);

var sin   = un_argf(Math.sin);
var cos   = un_argf(Math.cos);
var tan   = un_argf(Math.tan);
var asin  = un_argf(Math.asin);
var acos  = un_argf(Math.acos);
var atan  = un_argf(Math.atan);

var rand  = mon_argf(Math.random);

var operators = [
	add,
	sub,
	mul,
	div,
	pow,
	floor,
	round,
	ceil,
	sin,
	cos,
	tan,
	asin,
	acos,
	atan,
	rand,
];

