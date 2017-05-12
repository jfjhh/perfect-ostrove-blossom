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

/*
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
*/

Variable.prototype.toString = function()
{
	if (this.name === undefined) {
		return "<Undef. var>";
	} else {
		return this.name;
	}
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
}

/*
function interpret(s)
{
  var sexp = s.match(/\s*("[^"]*"|\(|\)|"|[^\s()"]+)/g);
  if (sexp[0] != "(" || sexp[sexp.length - 1] != ")") {
    return false;
  }
  sexp = sexp.slice(1, sexp.length - 1);

  var args = s.substr(1, s.length - 2).split(" ");
  var opsym = args.shift();
  
  var op = false;
  for (var i = 0; i < symbols.length; i++) {
    if (symbols[i] === opsym) {
      op = operators[i];
      break;
    }
  }
  
  if (!op) {
    return false;
  }
}
*/

function symarr_to_expr(a)
{
  if (!Array.isArray(a)) {
    return false;
  }
  
  for (var i = 0; i < a.length; i++) {
    if (Array.isArray(a[i])) {
      a[i] = symarr_to_expr(a[i]);
      if (a[i] === false) {
        return false;
      }
    } else if (!isNaN(a[i])) {
      var num = parseInt(a[i]);
      if (isNaN(num)) {
        return false;
      }
      a[i] = num;
    } else {
      var isop = false;
      for (var j = 0; j < symbols.length; j++) {
        if (symbols[j] === a[i]) {
          a[i] = operators[j];
          isop = true;
          break;
        }
      }
      if (!isop) {
        a[i] = new Variable(a[i]);
      }
    }
  }
  
  return new Expression(a);
}

function interpret(s)
{
  var sarr = s.parseSexpr();
  return symarr_to_expr(sarr);
}

var _$_ = interpret;

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

var floor = un_argf(Math.floor);
var round = un_argf(Math.round);
var ceil  = un_argf(Math.ceil);

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


/**
 * Sexpr parsing stuff I found online.
 */

String.prototype.parseSexpr = function() {
	var t = this.match(/\s*("[^"]*"|\(|\)|"|[^\s()"]+)/g);
	for (var o, c=0, i=t.length-1; i>=0; i--) {
		var n, ti = t[i].trim();
		if (ti == '"') return;
		else if (ti == '(') t[i]='[', c+=1;
		else if (ti == ')') t[i]=']', c-=1;
		else if ((n=+ti) == ti) t[i]=n;
		else t[i] = '\'' + ti.replace('\'', '\\\'') + '\'';
		if (i>0 && ti!=']' && t[i-1].trim()!='(' ) t.splice(i,0, ',');
		if (!c) if (!o) o=true; else return;
	}
	return c ? undefined : eval(t.join(''));
};

Array.prototype.toString = function() {
	var s=''; for (var i=0, e=this.length; i<e; i++) s+=(s?' ':'')+this[i];
	return '('+s+')';
};

Array.prototype.toPretty = function(s) {
	if (!s) s = '';
	var r = s + '(<br>';
	var s2 = s + Array(6).join('&nbsp;');
	for (var i=0, e=this.length; i<e; i+=1) {
		var ai = this[i];
		r += ai.constructor != Array ? s2+ai+'<br>' : ai.toPretty(s2);
	}
	return r + s + ')<br>';
};


/******************************************************************************/

var access_test = function()
{
	console.log(this);
	console.log(q);
};

var test = function()
{
	var vars = {q: 42};
	var q = 2;
	console.log(vars);
	console.log(this);
	access_test.call(test);
};

