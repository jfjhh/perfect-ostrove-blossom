/**
 * Perfect Ostrove Blossom Mathematics.
 * Alex Striff.
 */

"use strict";

/**
 * Variables.
 *
 * Name (`name`):
 * String token name of the variable.
 *
 * Value (`val`):
 * The value of the variable. It is `undefined` for variables whose values are
 * actually variable, and the value of the variable when the variable in an
 * Expression is substituted in.
 *
 * Use Old (`useold`):
 * Use Old essentially denotes if this is a constant variable, like a way of
 * substituting in constants (`useold === true`) or if the variable is actually
 * expected to change with successive expression evaluations (`useold ===
 * false`).
 *
 * To have variables act like unknowns all the time, leave the default `false`
 * value for useold. This means that consecutive applications:
 *
 * 	exp.$([var1]).$([var2]);
 *
 * will never result in a value, only an Expression with variables substituted
 * if they have their values defined.
 *
 * On the other hand, to do things like pass in constants to an expression that
 * are independent of other variables, make useold `true`. Variable values are
 * still updated if a newer one is passed, but evaluations have the property
 * that:
 *
 * 	exp.$([var1]).$([var2]) === exp.$([var1, var2]);
 *
 * Iff. `var1.useold === true` and the variables both have values.
 *
 * For example, to pass in 2*Math.PI to Expressions, you would use a variable
 * with `useold === true`, but to pass in a parameter like `t`, you would leave
 * the default `useold === false`.
 */
function Variable(name, value, useold)
{
	this.name   = name;
	this.val    = value;
	this.useold = useold || false;
}

/**
 * Turns the variable into it's name, for its use in a String representation of
 * an Expression.
 */
Variable.prototype.toString = function()
{
	if (this.name === undefined) {
		return "#undef";
	} else {
		return this.name;
	}
}

/**
 * Generates a Variable. Wrapper for the Variable constructor.
 */
function generate_variable(name, value, useold)
{
	return new Variable(name, value, useold);
}

/* Abbreviated forms. */
var Var = Variable;
var _v  = generate_variable;


/**
 * TouhouStrove S Expressions.
 *
 * IDK how to explain this to pleb non-Lispers, so TL;DR the argument Array of
 * constructor has the first element as the operator, and the rest as arguments.
 */
function Expression(args) /* RPN arguments. */
{
	this.op   = args.shift();
	this.args = args;
}

/**
 * Generates an Expression. Wrapper for the Expression constructor.
 */
function generate_expression() /* RPN arguments. */
{
	var args  = Array.from(arguments);
	return new Expression(args);
}

/**
 * Curries Expression `e` with Variables `a`.
 *
 * Expressions can only be evaluated when no Variables inside them are left
 * unsubstituted, so currying takes care of this by returning the curried
 * Expression and a flag that states if no variables are left undefined and the
 * Expression can be evaluated into an actual value.
 *
 * The output object looks like this:
 * {
 *     expression : <curried expression>,
 *     variables  : <true if variables unevaluated, false otherwise>
 * }
 */
function curry(e, a)
{
	var a = a || [];
	if (e === undefined || e.args === undefined) {
		return {
			expression : e,
			variables  : false,
		};
	}

	var vars = false;
	for (var i = 0; i < e.args.length; i++) {
		if (e.args[i].name !== undefined) { /* The argument is a Variable. */
			var is_var = true;
			for (var j = 0; j < a.length; j++) {
				if (a[j].name === e.args[i].name && a[j].val !== undefined) {
					e.args[i] = a[j];
					is_var    = false;
				} else if (e.args[i].useold === true) {
					is_var    = false;
				}
			}
			if (is_var) {
				vars = true;
			}
		} else { /* The argument is an Expression. Recursively curry. */
			var c     = curry(e.args[i], a);
			e.args[i] = c.expression;
			if (c.variables) {
				vars = true;
			}
		}
	}

	return {
		expression : e,
		variables  : vars,
	};
}

/* Abbreviated forms. */
var Exp = Expression;
var _   = generate_expression;
var $$  = curry;

/**
 * Object wrapper for evaluation.
 */
Expression.prototype.$ = function(a)
{
	return $(this, a);
};

/**
 * Object wrapper for currying.
 */
Expression.prototype.$$ = function(a)
{
	return $$(this, a);
};

/**
 * Turns an Expression into a String that can be displayed or re-interpreted
 * into the same Expression.
 */
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

/**
 * Evaluates Expression `e`, given Variables `a`.
 *
 * This curries the Expression and actually evaluates Expressions if they are
 * fully curried, recursively on sub-Expressions.
 */
function $(e, a) {
	a = a || [];

	/* Return curried expression if not fully curried. */
	var c = curry(e, a);
	if (c.variables) {
		return c.expression;
	}

	/* Otherwise, return the final value. */
	if (e.name !== undefined && e.val !== undefined) {
		return e.val;
	} else if (e.op === undefined) {
		return e; /* Identity if primitive. */
	} else if (e.op !== Object(e.op)) {
		return e.op; /* Operator if non-primitive. */
	} else { /* Evaluate using the operator on the given Variables. */
		return e.op(e.args, a);
	}
}

/**
 * Parse a S Expression String into an array of symbols.
 */
String.prototype.parseSexpr = function()
{
	var t = this.match(/\s*("[^"]*"|\(|\)|"|[^\s()"]+)/g);

	for (var o, c = 0, i = t.length - 1; i >= 0; i--) {
		var n;
		var ti = t[i].trim();

		if (ti == '"') {
			return;
		} else if (ti == '(') {
			t[i] = '[';
			c+=1;
		} else if (ti == ')') {
			t[i] = ']';
			c-=1;
		} else if ((n=+ti) == ti) {
			t[i] = n;
		} else {
			t[i] = '\'' + ti.replace('\'', '\\\'') + '\'';
		}

		if (i > 0 && ti !== ']' && t[i - 1].trim() != '(') {
			t.splice(i, 0, ',');
		}

		if (!c) {
			if (!o) {
				o = true;
			} else {
				return;
			}
		}
	}

	return c ? undefined : eval(t.join(''));
};

/**
 * Turns an array of symbols in an S Expression into the desired Expression
 * Object.
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
			var num = parseFloat(a[i]);
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

/**
 * Interprets an input String into an Expression.
 */
function interpret(s)
{
  var sarr = s.parseSexpr();
  return symarr_to_expr(sarr);
}

/* Abbreviated forms. */
var _$_ = interpret;

var PHI = (1 + Math.sqrt(5)) / 2;
var PI  = Math.PI;
var TAU = 2 * Math.PI;


/**
 * Definition of operators.
 *
 * Often mathematical functions.
 */

/**
 * Turns a function of no arguments, like `Math.rand`, and turns it into an
 * operator, suitable for the creation of an Expression.
 */
function mon_argf(f)
{
	var o  = function(a, v) { return f(); };
	o.args = 0;
	return o;
}

/**
 * Turns a function of one arguments, like `Math.sin`, and turns it into an
 * operator, suitable for the creation of an Expression.
 */
function un_argf(f)
{
	var o  = function(a, v) { return f($(a[0], v)); };
	o.args = 1;
	return o;
}

/**
 * Turns a function of two arguments, like `Math.pow`, and turns it into an
 * operator, suitable for the creation of an Expression.
 */
function bin_argf(f)
{
	var o  = function(a, v) { return f($(a[0], v), $(a[1], v)); };
	o.args = 2;
	return o;
}

/**
 * Define functions for arithmetic operators.
 */
function p_id(a)     { return a;     }
function p_add(a, b) { return a + b; }
function p_sub(a, b) { return b ? a - b : -a; }
function p_mul(a, b) { return a * b; }
function p_div(a, b) { return a / b; }

/**
 * Define operators.
 */
var id    = un_argf(p_id);         /* The identity.      */
var add   = bin_argf(p_add);       /* Addition.          */
var sub   = bin_argf(p_sub);       /* Subtraction.       */
var mul   = bin_argf(p_mul);       /* Multiplication.    */
var div   = bin_argf(p_div);       /* Division.          */
var pow   = bin_argf(Math.pow);    /* Exponentiation.    */
var floor = un_argf(Math.floor);   /* Flooring.          */
var round = un_argf(Math.round);   /* Rounding.          */
var ceil  = un_argf(Math.ceil);    /* Ceiling.           */
var sin   = un_argf(Math.sin);     /* Sin.               */
var cos   = un_argf(Math.cos);     /* Cosine.            */
var tan   = un_argf(Math.tan);     /* Tangent.           */
var asin  = un_argf(Math.asin);    /* Arc Sin.           */
var acos  = un_argf(Math.acos);    /* Arc Cosine.        */
var atan  = un_argf(Math.atan);    /* Arc Tangent.       */
var rand  = mon_argf(Math.random); /* Random Generation. */

/* Store the operators in an Array for use as a whole. */
var operators = [
	id,
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

/* The symbols for operators in their String representation. */
var symbols = [
	"=",
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

/* Assign operators their symbols. */
for (var i = 0; i < operators.length; i++) {
	operators[i].sym = symbols[i];
}

/**
 * Apply operator `op` over argument Array `exps` to create Expressions.
 */
function apply_op(op, exps)
{
	var out = [];
	if (op.args === 0) {
		var opexp  = new Expression([op]);
		var adjexp = new Expression([mul, _v("c"), opexp]);
		out = [adjexp];
	} else if (op.args === 1) {
		for (var i = 0; i < exps.length; i++) {
			var opexp  = new Expression([op, exps[i]]);
			var adjexp = new Expression([mul, _v("c"), opexp]);
			out[i] = adjexp;
		}
	} else if (op.args === 2) {
		for (var i = 0; i < exps.length; i++) {
			for (var j = 0; j < exps.length; j++) {
				var opexp  = new Expression([op, exps[i], exps[j]]);
				var adjexp = new Expression([mul, _v("c"), opexp]);
				out[i*exps.length + j] = adjexp;
			}
		}
	}
	return out;
}

/**
 * Change the generic constant `c` to unique constant scalar adjustments to
 * `exp`, like `c1`, `c2`, `c3`, etc.
 */
function constify(exp, cstr)
{
	cstr = cstr || "c";
	var cindex = 1;
	var str    = exp.toString();
	while (str.includes("c ")) {
		str = str.replace("c ", cstr + (cindex++) + " ");
	}
	return interpret(str);
}

/**
 * Permute all `ops` over their function space.
 *
 * `ops` is an Array of operator arrays, where each sub-array gives the set of
 * operators at that depth in the permutation, increasingly.
 *
 * E.g. for `ops = [[add, sub], [sin, cos]]`, the returned Expression array
 * would have elements of the form:
 * `(<add or sub> (<sin or cos> t1) (<sin or * cos> t2))`.
 */
function perm_funcs(ops)
{
	ops.reverse();
	var base_args = [];
	var base_name = "t";
	var maxargs   = 0;
	for (var i = 0; i < ops.length; i++) {
		for (var j = 0; j < ops[i].length; j++) {
			var a = ops[i][j].args;
			if (a > maxargs) {
				maxargs = a;
			}
		}
	}

	for (var i = 0; i < maxargs; i++) {
		base_args[i] = new Expression([mul,
			_v("c"), _v(base_name + (i + 1))]);
	}

	var exps = base_args;
	var out;
	for (var i = 0; i < ops.length; i++) {
		out = [];
		for (var j = 0; j < ops[i].length; j++) {
			var applied = apply_op(ops[i][j], exps);
			out = out.concat(applied);
		}
		exps = out;
	}

	// for (var i = 0; i < out.length; i++) {
	// 	out[i] = constify(out[i]);
	// }

	return out;
}

/**
 * For the Array of operator permutation arrays `op`, calculate the number of
 * permutations that will be output by `perm_funcs`.
 */
function count_perms_bin(ops)
{
	var count = 1 << 2 * (ops.length - 1); /* 4 ^ (ops.length - 1) */
	for (var i = 0; i < ops.length; i++) {
		count *= Math.pow(ops[i].length, 1 << i); /* ops[i].length ^ (2 ^ i) */
	}
	return count;
}

