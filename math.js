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

Variable.prototype.toString = function()
{
	var str = "<";

	if (this.name !== undefined) {
		str += this.name;
		if (this.val !== undefined) {
			str += ": " + this.val;
		}
	}
	str += ">";

	return str;
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

function curry(e, a)
{
	var a = a || [];
	if (e === undefined || e.args === undefined) {
		return {expression: e, variables: false};
	}

	var vars = false;
	for (var i = 0; i < e.args.length; i++) {
		if (e.args[i].name !== undefined) {
			if (e.args[i].val !== undefined) {
				e.args[i].val = e.args[i].val;
			}
			var is_var = true;
			for (var j = 0; j < a.length; j++) {
				if (a[j].name === e.args[i].name && a[j].val !== undefined) {
					e.args[i].val = a[j].val;
					is_var = false;
				}
			}
			if (is_var) {
				vars = true;
			}
		} else {
			var c = curry(e.args[i], a);
			e.args[i] = c.expression;
			if (c.variables) {
				vars = true;
			}
		}
	}

	return {expression: e, variables: vars};
}

var Exp = Expression;
var _   = generate_expression;
var $$  = curry;

Expression.prototype.$ = function(a)
{
	return $(this, a);
};

Expression.prototype.$$ = function(a)
{
	return $$(this, a);
};

Expression.prototype.toString = function()
{
	var str = "(";
	if (this.name !== undefined) {
		str += "<" + this.name;
		if (this.val === undefined) {
			str += ">"
		} else {
			str += " = " + this.val + ">";
		}
	} else if (this.op === undefined) {
		str += e;
	} else if (this.op !== Object(this.op)) {
		str += this.op.sym;
	} else {
		str += this.op.sym;
		for (var i = 0; i < this.args.length; i++) {
			str += " " + this.args[i].toString();
		}
	}
	str += ")";

	return str;
}

function $(e, a) {
	a = a || [];

	var c = curry(e, a);
	if (c.variables) {
		return c.out;
	}

	if (e.name !== undefined && e.val !== undefined) {
		return e.val;
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

function p_neg(a)    { return -a;    }
function p_add(a, b) { return a + b; }
function p_sub(a, b) { return a - b; }
function p_mul(a, b) { return a * b; }
function p_div(a, b) { return a / b; }

var id    = un_argf(function(x){return x;});

var neg   = un_argf(p_neg);

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
	id,
	neg,
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

var symbols = [
	"=@=",
	"-",
	"+",
	"-",
	"*",
	"/",
	"^",
	"floor",
	"round",
	"ceil",
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"rand",
];

for (var i = 0; i < operators.length; i++) {
	operators[i].sym = symbols[i];
}

